from fastapi import APIRouter, HTTPException,status
from services.plant_identification import identify_plant
from fastapi import UploadFile

router = APIRouter()


@router.post("/identify")
async def identify(file: UploadFile):
    try:
        result = await identify_plant(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    