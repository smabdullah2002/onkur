from datetime import date
from config import supabase


PLANTS_TABLE = "plants"
def list_plants(user_id: str) -> list[dict]:
    response = (
        supabase.table(PLANTS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def create_plant(payload: dict, user_id: str) -> dict | None:
    payload["user_id"] = user_id

    response = supabase.table(PLANTS_TABLE).insert(payload).execute()
    if not response.data:
        return None
    return response.data[0]


def update_plant(plant_id: str, updates: dict, user_id: str) -> dict | None:
    response = (
        supabase.table(PLANTS_TABLE)
        .update(updates)
        .eq("id", plant_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


def mark_plant_watered_today(plant_id: str, user_id: str) -> dict | None:
    updates = {"last_watered": date.today().isoformat()}
    return update_plant(plant_id, updates, user_id)


def delete_plant(plant_id: str, user_id: str) -> bool:
    response = (
        supabase.table(PLANTS_TABLE)
        .delete()
        .eq("id", plant_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(response.data)
