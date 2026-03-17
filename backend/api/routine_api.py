from fastapi import APIRouter, HTTPException, status

from services.routine_service import get_daily_routine


router = APIRouter()


@router.get("/routine/daily")
def daily_routine():
    try:
        return get_daily_routine()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
