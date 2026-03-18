import os
from typing import Any
from datetime import datetime, timezone, timedelta

import requests
from google import genai

from config import supabase
from services.plant_service import list_plants


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_CACHE_TABLE = "weather_tips"
CACHE_WINDOW_HOURS = 6


def get_condition_label(code: int | None, is_day: bool) -> str:
    if code is None:
        return "Unknown"

    table = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Dense drizzle",
        56: "Freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Rain",
        65: "Heavy rain",
        66: "Freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow",
        73: "Snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Rain showers",
        81: "Rain showers",
        82: "Violent rain showers",
        85: "Snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Severe thunderstorm with hail",
    }

    label = table.get(code, "Unknown")
    if code in {0, 1, 2, 3}:
        return f"{label} ({'Day' if is_day else 'Night'})"
    return label


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def get_cache_window_start(now_utc: datetime | None = None) -> datetime:
    now = now_utc or datetime.now(timezone.utc)
    hour_floor = (now.hour // CACHE_WINDOW_HOURS) * CACHE_WINDOW_HOURS
    return now.replace(hour=hour_floor, minute=0, second=0, microsecond=0)


def get_next_refresh(window_start: datetime) -> datetime:
    return window_start + timedelta(hours=CACHE_WINDOW_HOURS)


def normalize_coord(value: float) -> float:
    return round(float(value), 3)


def get_cached_tips(user_id: str, lat: float, lon: float, window_start: datetime) -> list[str] | None:
    try:
        response = (
            supabase.table(WEATHER_CACHE_TABLE)
            .select("care_tips")
            .eq("user_id", user_id)
            .eq("window_start", window_start.isoformat())
            .eq("latitude", normalize_coord(lat))
            .eq("longitude", normalize_coord(lon))
            .limit(1)
            .execute()
        )
        if response.data:
            tips = response.data[0].get("care_tips") or []
            if isinstance(tips, list) and tips:
                return tips
    except Exception:
        return None

    return None


def save_cached_tips(user_id: str, lat: float, lon: float, window_start: datetime, tips: list[str]) -> None:
    try:
        payload = {
            "user_id": user_id,
            "window_start": window_start.isoformat(),
            "window_end": get_next_refresh(window_start).isoformat(),
            "latitude": normalize_coord(lat),
            "longitude": normalize_coord(lon),
            "care_tips": tips,
            "source": "gemini",
        }

        existing = (
            supabase.table(WEATHER_CACHE_TABLE)
            .select("id")
            .eq("user_id", user_id)
            .eq("window_start", window_start.isoformat())
            .eq("latitude", normalize_coord(lat))
            .eq("longitude", normalize_coord(lon))
            .limit(1)
            .execute()
        )

        if existing.data:
            (
                supabase.table(WEATHER_CACHE_TABLE)
                .update(payload)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            supabase.table(WEATHER_CACHE_TABLE).insert(payload).execute()
    except Exception:
        return


def fallback_tips(temp_c: float, humidity: float, uv_index: float) -> list[str]:
    tips = []

    if temp_c >= 32:
        tips.append("High heat today. Water early morning and recheck soil by evening.")
    elif temp_c <= 18:
        tips.append("Cool weather today. Reduce watering frequency and avoid overwatering.")

    if humidity >= 75:
        tips.append("Humidity is high. Improve airflow around leaves to reduce fungal risk.")
    elif humidity <= 35:
        tips.append("Air is dry. Mist humidity-loving plants or group pots together.")

    if uv_index >= 8:
        tips.append("UV is very strong. Move shade-preferring plants away from direct sun.")
    elif uv_index >= 6:
        tips.append("Strong sun window today. Protect tender leaves during noon hours.")

    if not tips:
        tips.append("Weather looks moderate. Follow each plant's normal watering schedule.")

    return tips[:4]


def generate_ai_tips(temp_c: float, humidity: float, uv_index: float, plant_names: list[str]) -> list[str]:
    if not GEMINI_API_KEY:
        return fallback_tips(temp_c, humidity, uv_index)

    client = genai.Client(api_key=GEMINI_API_KEY)
    plants_text = ", ".join(plant_names[:12]) if plant_names else "no saved plants"

    prompt = (
        "You are a practical home-garden assistant in Bangladesh. "
        "Use this live weather to generate 3 to 4 short care tips for today. "
        "Each tip must be one sentence and actionable. "
        "Avoid markdown symbols and numbering.\n\n"
        f"Temperature (C): {temp_c}\n"
        f"Humidity (%): {humidity}\n"
        f"UV Index: {uv_index}\n"
        f"Plants: {plants_text}\n"
    )

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt],
        )
        lines = [line.strip("- *\t ") for line in (response.text or "").splitlines() if line.strip()]
        lines = [line for line in lines if len(line) > 6]
        if lines:
            return lines[:4]
    except Exception:
        pass

    return fallback_tips(temp_c, humidity, uv_index)


def get_weather_widget(lat: float = 23.8103, lon: float = 90.4125, user_id: str = "anonymous") -> dict:
    response = requests.get(
        WEATHER_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,uv_index,weather_code,is_day",
            "timezone": "auto",
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json()
    current = data.get("current", {})
    weather_code = current.get("weather_code")
    is_day = bool(current.get("is_day", 1))

    temp_c = to_float(current.get("temperature_2m"))
    humidity = to_float(current.get("relative_humidity_2m"))
    uv_index = to_float(current.get("uv_index"))

    plants = list_plants(user_id)
    plant_names = [item.get("name", "").strip() for item in plants if item.get("name")]

    window_start = get_cache_window_start()
    next_refresh_at = get_next_refresh(window_start)

    cached_tips = get_cached_tips(user_id, lat, lon, window_start)
    if cached_tips:
        care_tips = cached_tips
        tips_cached = True
    else:
        care_tips = generate_ai_tips(temp_c, humidity, uv_index, plant_names)
        save_cached_tips(user_id, lat, lon, window_start, care_tips)
        tips_cached = False

    return {
        "location": {
            "latitude": lat,
            "longitude": lon,
            "timezone": data.get("timezone"),
        },
        "weather": {
            "temperature_c": temp_c,
            "humidity": humidity,
            "uv_index": uv_index,
            "weather_code": weather_code,
            "condition": get_condition_label(weather_code, is_day),
            "is_day": is_day,
        },
        "care_tips": care_tips,
        "tips_cached": tips_cached,
        "cache_window_hours": CACHE_WINDOW_HOURS,
        "cache_window_start_utc": window_start.isoformat(),
        "next_refresh_at_utc": next_refresh_at.isoformat(),
        "source": "open-meteo + gemini",
    }
