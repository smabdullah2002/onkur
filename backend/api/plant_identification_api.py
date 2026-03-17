from fastapi import APIRouter, HTTPException, Response, status
from services.plant_identification import identify_plant
from fastapi import File, UploadFile
from schemas.plant import PlantCreate, PlantOut, PlantUpdate
from services.plant_service import (
    create_plant,
    delete_plant,
    list_plants,
    mark_plant_watered_today,
    update_plant,
)

router = APIRouter()


@router.post("/identify")
async def identify(file: UploadFile = File(...)):
    try:
        result = await identify_plant(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/plants", response_model=list[PlantOut])
def get_plants():
    try:
        return list_plants()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/plants", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def add_plant(payload: PlantCreate):
    try:
        created = create_plant(payload.model_dump(mode="json"))
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create plant")
        return created
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/plants/{plant_id}", response_model=PlantOut)
def patch_plant(plant_id: str, payload: PlantUpdate):
    try:
        updates = payload.model_dump(mode="json", exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        updated = update_plant(plant_id, updates)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/plants/{plant_id}/watered-today", response_model=PlantOut)
def water_plant_today(plant_id: str):
    try:
        updated = mark_plant_watered_today(plant_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/plants/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_plant(plant_id: str):
    try:
        deleted = delete_plant(plant_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    