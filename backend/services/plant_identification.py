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
PLANT_ID_HEALTH_URL = os.getenv("PLANT_ID_HEALTH_URL") or "https://plant.id/api/v3/health_assessment"
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


def _to_probability(value) -> float:
    try:
        parsed = float(value)
        if parsed < 0:
            return 0.0
        if parsed > 1:
            return 1.0
        return parsed
    except Exception:
        return 0.0


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


def _enrich_health_assessment_with_gemini(health_response: dict) -> dict:
    result = health_response.get("result") or {}
    disease = result.get("disease") or {}
    suggestions = disease.get("suggestions") or []

    if not isinstance(suggestions, list) or not suggestions:
        health_response["gemini_care_tips"] = {
            "selected_disease": "",
            "selected_probability": 0.0,
            "is_healthy": bool((result.get("is_healthy") or {}).get("binary", False)),
            "care_plan": {
                "immediate_actions": [],
                "medicine_and_treatment": [],
                "prevention": [],
            },
            "note": "No disease suggestions were returned by Plant.id.",
        }
        return health_response

    best_suggestion = max(suggestions, key=lambda item: _to_probability((item or {}).get("probability")))
    selected_disease = str((best_suggestion or {}).get("name") or "Unknown disease").strip()
    selected_probability = _to_probability((best_suggestion or {}).get("probability"))
    is_healthy = bool((result.get("is_healthy") or {}).get("binary", False))

    if not GEMINI_API_KEY or gemini_client is None:
        health_response["gemini_care_tips"] = {
            "selected_disease": selected_disease,
            "selected_probability": selected_probability,
            "is_healthy": is_healthy,
            "care_plan": {
                "immediate_actions": [],
                "medicine_and_treatment": [],
                "prevention": [],
            },
            "note": "GEMINI_API_KEY is missing. Care tips were not generated.",
        }
        return health_response

    compact_suggestions = [
        {
            "name": str((item or {}).get("name") or ""),
            "probability": _to_probability((item or {}).get("probability")),
        }
        for item in suggestions[:5]
    ]

    prompt = (
        "You are a plant disease specialist. "
        "Given a disease prediction and probabilities, return ONLY valid JSON with exactly these keys: "
        "selected_disease (string), selected_probability (number 0-1), "
        "care_plan (object with keys immediate_actions, medicine_and_treatment, prevention where each value is an array of concise strings), "
        "note (string). "
        "Keep advice practical and safe for home gardeners in Bangladesh. "
        "Include common fungicide/insecticide style guidance only when appropriate, and mention basic dosage caution in note. "
        "Do not include markdown or any extra keys. "
        f"is_healthy: {is_healthy}. "
        f"top_disease: {selected_disease}. "
        f"top_probability: {selected_probability}. "
        f"top_suggestions: {json.dumps(compact_suggestions)}"
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

    care_plan = parsed.get("care_plan") if isinstance(parsed.get("care_plan"), dict) else {}
    immediate_actions = care_plan.get("immediate_actions") if isinstance(care_plan.get("immediate_actions"), list) else []
    medicine_and_treatment = (
        care_plan.get("medicine_and_treatment") if isinstance(care_plan.get("medicine_and_treatment"), list) else []
    )
    prevention = care_plan.get("prevention") if isinstance(care_plan.get("prevention"), list) else []

    health_response["gemini_care_tips"] = {
        "selected_disease": str(parsed.get("selected_disease") or selected_disease).strip(),
        "selected_probability": _to_probability(parsed.get("selected_probability", selected_probability)),
        "is_healthy": is_healthy,
        "care_plan": {
            "immediate_actions": [str(item).strip() for item in immediate_actions if str(item).strip()],
            "medicine_and_treatment": [
                str(item).strip() for item in medicine_and_treatment if str(item).strip()
            ],
            "prevention": [str(item).strip() for item in prevention if str(item).strip()],
        },
        "note": str(parsed.get("note") or "Follow product labels and local agricultural guidance.").strip(),
    }

    return health_response

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


def health_assessment_test(payload: dict) -> dict:
    if not API_KEY:
        raise ValueError("PLANT_ID_API is missing in backend/.env")

    images = payload.get("images") or []
    if not isinstance(images, list) or not images:
        raise ValueError("images must be a non-empty list")

    request_payload = {
        "images": images,
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "similar_images": bool(payload.get("similar_images", True)),
        "health": payload.get("health", "only"),
        "datetime": payload.get("datetime"),
    }
    request_payload = {key: value for key, value in request_payload.items() if value is not None}

    headers = {
        "Api-Key": API_KEY,
        "Content-Type": "application/json",
    }

    response = requests.post(
        PLANT_ID_HEALTH_URL,
        headers=headers,
        json=request_payload,
        timeout=45,
    )

    if response.status_code == 400:
        # Some Plant.id setups expect plain base64 image values instead of data URI values.
        fallback_images = []
        for image in images:
            if isinstance(image, str) and image.startswith("data:") and "," in image:
                fallback_images.append(image.split(",", 1)[1])
            else:
                fallback_images.append(image)

        if fallback_images != images:
            fallback_payload = dict(request_payload)
            fallback_payload["images"] = fallback_images
            fallback_response = requests.post(
                PLANT_ID_HEALTH_URL,
                headers=headers,
                json=fallback_payload,
                timeout=45,
            )
            if fallback_response.ok:
                return _enrich_health_assessment_with_gemini(fallback_response.json())

            message = fallback_response.text.strip() or "Bad request from Plant.id"
            raise ValueError(f"Plant.id health assessment failed (fallback): {message}")

        message = response.text.strip() or "Bad request from Plant.id"
        raise ValueError(f"Plant.id health assessment failed: {message}")

    if not response.ok:
        message = response.text.strip() or f"HTTP {response.status_code}"
        raise ValueError(f"Plant.id health assessment failed: {message}")

    return _enrich_health_assessment_with_gemini(response.json())


async def health_assessment_test_from_file(
    file: UploadFile,
    latitude: float | None = None,
    longitude: float | None = None,
    similar_images: bool = True,
    health: str = "only",
    datetime_value: str | None = None,
) -> dict:
    image = await file.read()
    if not image:
        raise ValueError("Empty image file")

    mime_type = file.content_type or "image/jpeg"
    encoded = base64.b64encode(image).decode("utf-8")
    image_data_uri = f"data:{mime_type};base64,{encoded}"

    return health_assessment_test(
        {
            "images": [image_data_uri],
            "latitude": latitude,
            "longitude": longitude,
            "similar_images": similar_images,
            "health": health,
            "datetime": datetime_value,
        }
    )