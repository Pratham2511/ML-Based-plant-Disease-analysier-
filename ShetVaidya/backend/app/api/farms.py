from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.models.farm import Farm

router = APIRouter()


class FarmCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    crop: str = Field(min_length=1, max_length=100)
    area_acres: Optional[float] = None
    district: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    crop: Optional[str] = Field(default=None, min_length=1, max_length=100)
    area_acres: Optional[float] = None
    district: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None


class FarmResponse(BaseModel):
    id: str
    name: str
    crop: str
    area_acres: Optional[float]
    district: Optional[str]
    soil_type: Optional[str]
    irrigation_type: Optional[str]
    is_active: bool
    created_at: str


def _serialize_farm(farm: Farm) -> FarmResponse:
    return FarmResponse(
        id=str(farm.id),
        name=farm.name,
        crop=farm.crop,
        area_acres=farm.area_acres,
        district=farm.district,
        soil_type=farm.soil_type,
        irrigation_type=farm.irrigation_type,
        is_active=bool(farm.is_active),
        created_at=farm.created_at.isoformat() if isinstance(farm.created_at, datetime) else str(farm.created_at),
    )


def _get_user_farm_or_404(db: Session, user_id: str, farm_id: UUID) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.get("", response_model=list[FarmResponse])
def list_farms(current_user: deps.TokenUser = Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    farms = (
        db.query(Farm)
        .filter(Farm.user_id == current_user.id)
        .order_by(Farm.is_active.desc(), Farm.created_at.asc())
        .all()
    )
    return [_serialize_farm(farm) for farm in farms]


@router.post("", response_model=FarmResponse)
def create_farm(payload: FarmCreate, current_user: deps.TokenUser = Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    existing_count = db.query(Farm).filter(Farm.user_id == current_user.id).count()
    is_first_farm = existing_count == 0

    farm = Farm(
        user_id=current_user.id,
        name=payload.name.strip(),
        crop=payload.crop.strip(),
        area_acres=payload.area_acres,
        district=payload.district.strip() if payload.district else None,
        soil_type=payload.soil_type.strip() if payload.soil_type else None,
        irrigation_type=payload.irrigation_type.strip() if payload.irrigation_type else None,
        is_active=is_first_farm,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return _serialize_farm(farm)


@router.put("/{farm_id}", response_model=FarmResponse)
def update_farm(
    farm_id: UUID,
    payload: FarmUpdate,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    farm = _get_user_farm_or_404(db, current_user.id, farm_id)

    if payload.name is not None:
        farm.name = payload.name.strip()
    if payload.crop is not None:
        farm.crop = payload.crop.strip()
    if payload.area_acres is not None:
        farm.area_acres = payload.area_acres
    if payload.district is not None:
        farm.district = payload.district.strip() or None
    if payload.soil_type is not None:
        farm.soil_type = payload.soil_type.strip() or None
    if payload.irrigation_type is not None:
        farm.irrigation_type = payload.irrigation_type.strip() or None

    db.commit()
    db.refresh(farm)
    return _serialize_farm(farm)


@router.delete("/{farm_id}")
def delete_farm(
    farm_id: UUID,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    farm = _get_user_farm_or_404(db, current_user.id, farm_id)
    deleting_active = bool(farm.is_active)

    db.delete(farm)
    db.commit()

    if deleting_active:
        fallback = (
            db.query(Farm)
            .filter(Farm.user_id == current_user.id)
            .order_by(Farm.created_at.asc())
            .first()
        )
        if fallback:
            fallback.is_active = True
            db.commit()

    return {"status": "deleted"}


@router.post("/{farm_id}/activate", response_model=FarmResponse)
def activate_farm(
    farm_id: UUID,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    farm = _get_user_farm_or_404(db, current_user.id, farm_id)

    (
        db.query(Farm)
        .filter(Farm.user_id == current_user.id, Farm.is_active.is_(True))
        .update({Farm.is_active: False}, synchronize_session=False)
    )
    farm.is_active = True
    db.commit()
    db.refresh(farm)
    return _serialize_farm(farm)
