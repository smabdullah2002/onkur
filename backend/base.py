from fastapi import APIRouter
from api import plant_identification_api
from api import routine_api


api_router = APIRouter()


api_router.include_router(plant_identification_api.router, prefix="", tags=["plant"])
api_router.include_router(routine_api.router, prefix="", tags=["routine"])



