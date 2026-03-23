from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.area_intelligence import (
    AreaIntelligenceResponse,
    DetectDistrictRequest,
    DetectDistrictResponse,
    DistrictListResponse,
)
from app.services import area_intelligence as area_service

router = APIRouter()


@router.get("/districts", response_model=DistrictListResponse)
def list_districts(
    db: Session = Depends(deps.get_db),
):
    area_service.ensure_area_intelligence_seed(db)
    return {
        "state": area_service.MAHARASHTRA_STATE,
        "districts": area_service.get_supported_districts(),
    }


@router.post("/detect-district", response_model=DetectDistrictResponse)
async def detect_district(
    payload: DetectDistrictRequest,
):
    district = await area_service.reverse_geocode_district(payload.latitude, payload.longitude)
    source = "nominatim"
    if not district:
        district = area_service.nearest_district(payload.latitude, payload.longitude)
        source = "nearest-centroid"

    return {
        "state": area_service.MAHARASHTRA_STATE,
        "district": district,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "source": source,
    }


@router.get("/insights", response_model=AreaIntelligenceResponse)
def get_area_insights(
    district: str,
    db: Session = Depends(deps.get_db),
):
    return area_service.get_area_intelligence_payload(db, district)
