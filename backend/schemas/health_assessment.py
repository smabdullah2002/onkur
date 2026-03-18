from pydantic import BaseModel, Field


class HealthAssessmentTestRequest(BaseModel):
    images: list[str] = Field(min_length=1)
    latitude: float | None = None
    longitude: float | None = None
    similar_images: bool = True
    health: str = "only"
    datetime: str | None = None
