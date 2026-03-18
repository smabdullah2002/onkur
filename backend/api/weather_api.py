from fastapi import APIRouter, Header, HTTPException, Query, status

from services.auth_service import resolve_user_id
from services.weather_service import get_weather_widget


router = APIRouter()


@router.get("/weather/widget")
def weather_widget(
    lat: float = Query(23.8103, ge=-90, le=90),
    lon: float = Query(90.4125, ge=-180, le=180),
    authorization: str | None = Header(default=None),
):
    try:
        user_id = resolve_user_id(authorization)
        return get_weather_widget(lat=lat, lon=lon, user_id=user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
