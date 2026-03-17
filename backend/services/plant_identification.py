import requests
import base64
import json
import re
from dotenv import load_dotenv
import os
from fastapi import UploadFile

load_dotenv()

API_KEY= os.getenv("PLANT_ID_API")
API_URL = os.getenv("PLANT_ID_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_MODELS = [
    "gemini-2.5-flash",
]


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
        return value.strip().lower() in {"true", "yes", "1", "direct", "sun"}
    return False


def _to_freq(value) -> float:
    try:
        parsed = float(value)
        if parsed <= 0:
            return 7
        return parsed
    except Exception:
        return 7


def _enrich_with_gemini(plant_name: str) -> dict:
    if not GEMINI_API_KEY:
        return {
            "bangla_name": "",
            "suggested_water_freq": 7,
            "suggested_direct_sunlight": False,
        }

    prompt = (
        "You are a plant expert. For this plant name, return ONLY JSON with keys: "
        "bangla_name (string), suggested_water_freq (number in days), suggested_direct_sunlight (boolean). "
        f"Plant name: {plant_name}."
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 200,
        },
    }

    parsed = {}
    for model in GEMINI_MODELS:
        try:
            response = requests.post(
                f"{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_API_KEY}",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                continue

            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
            parsed = _extract_json(text)
            if parsed:
                break
        except Exception:
            continue

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