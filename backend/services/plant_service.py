from datetime import date
from config import SUPABASE_DEV_USER_ID, supabase


PLANTS_TABLE = "plants"


def list_plants() -> list[dict]:
    response = supabase.table(PLANTS_TABLE).select("*").order("created_at", desc=True).execute()
    return response.data or []


def create_plant(payload: dict) -> dict | None:
    if "user_id" not in payload or not payload["user_id"]:
        if not SUPABASE_DEV_USER_ID:
            raise ValueError(
                "Missing user_id. Set SUPABASE_DEV_USER_ID in backend/.env for development without auth."
            )
        payload["user_id"] = SUPABASE_DEV_USER_ID

    response = supabase.table(PLANTS_TABLE).insert(payload).execute()
    if not response.data:
        return None
    return response.data[0]


def update_plant(plant_id: str, updates: dict) -> dict | None:
    response = supabase.table(PLANTS_TABLE).update(updates).eq("id", plant_id).execute()
    if not response.data:
        return None
    return response.data[0]


def mark_plant_watered_today(plant_id: str) -> dict | None:
    updates = {"last_watered": date.today().isoformat()}
    return update_plant(plant_id, updates)


def delete_plant(plant_id: str) -> bool:
    response = supabase.table(PLANTS_TABLE).delete().eq("id", plant_id).execute()
    return bool(response.data)
