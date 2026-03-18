from fastapi import APIRouter, Form, Header, HTTPException, Response, status
from services.plant_identification import (
    health_assessment_test,
    health_assessment_test_from_file,
    identify_plant,
)
from services.auth_service import resolve_user_id
from fastapi import File, UploadFile
from schemas.health_assessment import HealthAssessmentTestRequest
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


@router.post("/identify/health-assessment-test")
def identify_health_assessment_test(payload: HealthAssessmentTestRequest):
    try:
        return health_assessment_test(payload.model_dump(mode="json"))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/identify/health-assessment-test-upload")
async def identify_health_assessment_test_upload(
    file: UploadFile = File(...),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    similar_images: bool = Form(default=True),
    health: str = Form(default="only"),
    datetime: str | None = Form(default=None),
):
    try:
        return await health_assessment_test_from_file(
            file=file,
            latitude=latitude,
            longitude=longitude,
            similar_images=similar_images,
            health=health,
            datetime_value=datetime,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/plants", response_model=list[PlantOut])
def get_plants(authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        return list_plants(user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/plants", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def add_plant(payload: PlantCreate, authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        created = create_plant(payload.model_dump(mode="json"), user_id)
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create plant")
        return created
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/plants/{plant_id}", response_model=PlantOut)
def patch_plant(plant_id: str, payload: PlantUpdate, authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        updates = payload.model_dump(mode="json", exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        updated = update_plant(plant_id, updates, user_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/plants/{plant_id}/watered-today", response_model=PlantOut)
def water_plant_today(plant_id: str, authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        updated = mark_plant_watered_today(plant_id, user_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/plants/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_plant(plant_id: str, authorization: str | None = Header(default=None)):
    try:
        user_id = resolve_user_id(authorization)
        deleted = delete_plant(plant_id, user_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    