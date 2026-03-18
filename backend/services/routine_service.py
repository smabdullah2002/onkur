from datetime import date, timedelta
from google import genai

from config import GEMINI_API_KEY, supabase
from services.plant_service import list_plants


client = genai.Client(api_key=GEMINI_API_KEY)
DAILY_ROUTINES_TABLE = "daily_routines"


def _next_water_date(last_watered: str | None, water_freq: float | None) -> str | None:
    """Calculate the next watering date based on last watered date and frequency."""
    if not last_watered:
        return None

    try:
        start = date.fromisoformat(last_watered)
        days = max(1, int(round(float(water_freq or 0))))
        next_date = start + timedelta(days=days)
        return next_date.isoformat()
    except (ValueError, TypeError):
        return None
def _get_plant_inputs(user_id: str) -> list[dict]:
    """Fetch and normalize plant data."""
    plants = list_plants(user_id)
    normalized = []

    for item in plants:
        name = (item.get("name") or "").strip()
        if not name:
            continue

        normalized.append({
            "name": name,
            "last_watered": item.get("last_watered"),
            "water_freq": item.get("water_freq"),
            "next_water_date": _next_water_date(item.get("last_watered"), item.get("water_freq")),
        })

    return sorted(normalized, key=lambda p: p["name"].lower())


def _fingerprint_plants(plants: list[dict]) -> str:
    """Create a unique identifier for the current plant state."""
    return "|".join(
        f"{p['name']}::{p.get('last_watered') or ''}::{p.get('water_freq') or ''}"
        for p in plants
    )


def _build_prompt(plants: list[dict], today: str) -> str:
    """Build the AI prompt for routine generation."""
    if not plants:
        return (
            "You are a gardener with 5 years of experience. "
            f"Today is {today}. No plants are currently saved. "
            "Return a short plain-text routine telling the user to add plants first."
        )

    plant_info = "\n".join(
        f"- {p['name']}: Last watered {p.get('last_watered') or 'unknown'}, "
        f"frequency {p.get('water_freq') or 'unknown'} days, "
        f"next water {p.get('next_water_date') or 'unknown'}"
        for p in plants
    )

    return (
        "You are a gardener with 5 years of experience. Create a concise daily plant-care routine "
        "for today that helps a plant parent take the right actions.\n\n"
        f"Today: {today}\n"
        "Plants:\n"
        f"{plant_info}\n\n"
        "Instructions:\n"
        "- Use plain text only.\n"
        "- Do not use markdown symbols like ** or #.\n"
        "- Organize into: Morning, Afternoon, Evening sections.\n"
        "- Use actionable bullet points.\n"
        "- Reference plant names in recommendations.\n"
        "- Consider watering schedules in your suggestions."
    )


def _normalize_routine_text(text: str) -> str:
    cleaned = (text or "").replace("**", "").strip()
    return cleaned


def _is_valid_routine(text: str) -> bool:
    routine = (text or "").strip().lower()
    if len(routine) < 80:
        return False
    if "morning" not in routine or "afternoon" not in routine or "evening" not in routine:
        return False
    if routine.endswith(":"):
        return False
    return True


def _generate_routine(plants: list[dict], today: str) -> str:
    """Generate routine text using Gemini."""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[_build_prompt(plants, today)],
    )

    text = _normalize_routine_text(response.text or "")
    if not _is_valid_routine(text):
        raise RuntimeError("Gemini returned empty routine")
    return text


def _get_cached_routine(user_id: str, today: str) -> dict | None:
    """Fetch saved routine for today."""
    response = (
        supabase.table(DAILY_ROUTINES_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("routine_date", today)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def _save_or_update_routine(
    user_id: str, today: str, fingerprint: str, routine_text: str
) -> dict:
    """Save new routine or update existing one."""
    payload = {
        "user_id": user_id,
        "routine_date": today,
        "plant_fingerprint": fingerprint,
        "routine_text": routine_text,
        "source": "gemini",
    }

    existing = _get_cached_routine(user_id, today)

    if existing:
        response = (
            supabase.table(DAILY_ROUTINES_TABLE)
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        )
    else:
        response = supabase.table(DAILY_ROUTINES_TABLE).insert(payload).execute()

    if not response.data:
        raise RuntimeError(
            "Failed to save routine to Supabase. Ensure daily_routines table exists."
        )

    return response.data[0]


def get_daily_routine(user_id: str) -> dict:
    """Get or generate daily routine for plants."""
    # Validate configuration
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing in backend/.env")

    today = date.today().isoformat()
    plants = _get_plant_inputs(user_id)
    fingerprint = _fingerprint_plants(plants)

    # Check cache
    cached = _get_cached_routine(user_id, today)
    if (
        cached
        and cached.get("plant_fingerprint") == fingerprint
        and _is_valid_routine(_normalize_routine_text(cached.get("routine_text") or ""))
    ):
        return {
            "date": today,
            "plants": plants,
            "routine": _normalize_routine_text(cached["routine_text"]),
            "source": cached.get("source", "gemini"),
            "cached": True,
        }

    # Generate and save new routine
    routine_text = _generate_routine(plants, today)
    saved = _save_or_update_routine(user_id, today, fingerprint, routine_text)

    return {
        "date": today,
        "plants": plants,
        "routine": saved.get("routine_text", routine_text),
        "source": saved.get("source", "gemini"),
        "cached": False,
    }