from fastapi import APIRouter, Header, HTTPException, status

from services.auth_service import resolve_user_id
from services.routine_service import get_daily_routine


router = APIRouter()


@router.get("/routine/daily")
def daily_routine(authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        return get_daily_routine(user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
