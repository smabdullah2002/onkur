import requests
import base64
import json
import re
import time
from dotenv import load_dotenv
import os
from fastapi import UploadFile
from google import genai

load_dotenv()

API_KEY= os.getenv("PLANT_ID_API")
API_URL = os.getenv("PLANT_ID_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}

    try:
        return json.loads(match.group(0))
    except Exception:
        return {}


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "1", "direct", "sun"}:
            return True
        if "direct" in normalized or "full sun" in normalized:
            return True
        if "shade" in normalized or "indirect" in normalized:
            return False
    return False


def _to_freq(value) -> float:
    try:
        parsed = float(value)
        if parsed <= 0:
            return 7
        return parsed
    except Exception:
        if isinstance(value, str):
            normalized = value.strip().lower()

            day_match = re.search(r"every\s+(\d+(?:\.\d+)?)\s*day", normalized)
            if day_match:
                return max(1.0, float(day_match.group(1)))

            if "daily" in normalized or "every day" in normalized:
                return 1
            if "twice a week" in normalized:
                return 3.5
            if "once a week" in normalized or "weekly" in normalized:
                return 7
            if "every 2 week" in normalized or "biweekly" in normalized:
                return 14
            if "month" in normalized:
                return 30

        return 7


def _enrich_with_gemini(plant_name: str) -> dict:
    if not GEMINI_API_KEY or gemini_client is None:
        return {
            "bangla_name": "",
            "suggested_water_freq": 7,
            "suggested_direct_sunlight": False,
        }

    prompt = (
        "You are a plant care expert for Bangladesh. Return ONLY valid JSON with exactly these keys: "
        "bangla_name (string), suggested_water_freq (number, days between watering), "
        "suggested_direct_sunlight (boolean where true means direct sun, false means shade/indirect). "
        "and by bangla name I mean the common name used in Bangladesh, not a scientific name."
        "Do not include markdown or extra text. "
        f"Plant name: {plant_name}."
    )

    parsed = {}
    for attempt in range(3):
        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[prompt],
            )
            parsed = _extract_json((response.text or "").strip())
            if parsed:
                break
        except Exception:
            pass

        if attempt < 2:
            time.sleep(1.2 * (attempt + 1))

    return {
        "bangla_name": str(parsed.get("bangla_name") or "").strip(),
        "suggested_water_freq": _to_freq(parsed.get("suggested_water_freq")),
        "suggested_direct_sunlight": _to_bool(parsed.get("suggested_direct_sunlight")),
    }

async def identify_plant(file:UploadFile):
    image = await file.read()
    if not image:
        raise ValueError("Empty image file")

    encoded = base64.b64encode(image).decode("utf-8")

    payload = {
        "images": [encoded],
    }

    headers = {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
    }

    response = requests.post(
        API_URL,
        json=payload,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    suggestions = data.get("result", {}).get("classification", {}).get("suggestions", [])
    if not suggestions:
        raise ValueError("Could not identify plant from image")

    best_match = suggestions[0]
    plant_name = best_match.get("name")
    confidence = best_match.get("probability")

    if not plant_name:
        raise ValueError("Plant name not found in identification response")

    ai_meta = _enrich_with_gemini(plant_name)

    return {
        "plant_name": plant_name,
        "bangla_name": ai_meta["bangla_name"],
        "suggested_water_freq": ai_meta["suggested_water_freq"],
        "suggested_direct_sunlight": ai_meta["suggested_direct_sunlight"],
        "confidence": confidence,
        "alternatives": [item.get("name") for item in suggestions[1:4] if item.get("name")],
        "raw": data,
    }