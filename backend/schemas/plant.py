from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class PlantBase(BaseModel):
    name: str
    bangla_name: str | None = None
    water_freq: float
    direct_sunlight: bool = False
    last_watered: date | None = None
    image_url: str | None = None


class PlantCreate(PlantBase):
    pass


class PlantUpdate(BaseModel):
    name: str | None = None
    bangla_name: str | None = None
    water_freq: float | None = None
    direct_sunlight: bool | None = None
    last_watered: date | None = None
    image_url: str | None = None


class PlantOut(PlantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int | str
    created_at: datetime | None = None
