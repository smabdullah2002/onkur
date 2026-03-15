from fastapi import APIRouter
from api import plant_identification_api


api_router = APIRouter()


api_router.include_router(plant_identification_api.router, prefix="", tags=["plant"])



