from config import SUPABASE_DEV_USER_ID, supabase


def resolve_user_id(authorization: str | None, allow_dev_fallback: bool = False) -> str:
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token:
        try:
            user_response = supabase.auth.get_user(token)
            user = getattr(user_response, "user", None)
            user_id = getattr(user, "id", None)
            if not user_id and isinstance(user_response, dict):
                user_id = ((user_response.get("user") or {}).get("id"))
            if user_id:
                return str(user_id)
        except Exception as exc:
            raise ValueError(f"Invalid or expired access token: {exc}")

    if allow_dev_fallback and SUPABASE_DEV_USER_ID:
        return SUPABASE_DEV_USER_ID

    raise ValueError(
        "Authentication required. Sign in and send a valid Bearer token."
    )