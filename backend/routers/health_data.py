from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import logging

from backend.database import get_db
from backend.models import District, Village, HealthRecord, PredictivePattern
from backend.dependencies import get_current_user, require_admin
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Router requires authentication on all routes; individual write routes also require admin role.
router = APIRouter(dependencies=[Depends(get_current_user)])


# Pydantic schemas
class DistrictCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    population: int = Field(None, ge=0)
    area_sq_km: float = Field(None, ge=0)


class DistrictResponse(BaseModel):
    id: int
    name: str
    code: str
    population: int | None
    area_sq_km: float | None
    created_at: datetime
    
    class Config:
        from_attributes = True


class VillageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    district_id: int = Field(..., gt=0)
    population: int = Field(None, ge=0)
    latitude: float = Field(None, ge=-90, le=90)
    longitude: float = Field(None, ge=-180, le=180)


class VillageResponse(BaseModel):
    id: int
    name: str
    code: str
    district_id: int
    population: int | None
    latitude: float | None
    longitude: float | None
    created_at: datetime
    
    class Config:
        from_attributes = True


class HealthRecordCreate(BaseModel):
    district_id: int = Field(..., gt=0)
    village_id: int = Field(..., gt=0)
    disease_type: str = Field(..., min_length=1, max_length=100)
    case_count: int = Field(0, ge=0)
    severity_level: str = Field(None, pattern="^(low|medium|high|critical)$")
    intervention_type: str = Field(None, max_length=100)
    intervention_notes: str = Field(None)
    recorded_by: str = Field(..., min_length=1, max_length=100)


class HealthRecordResponse(BaseModel):
    id: int
    district_id: int
    village_id: int
    disease_type: str
    case_count: int
    severity_level: str | None
    intervention_type: str | None
    intervention_notes: str | None
    outcome_status: str | None
    recorded_by: str
    recorded_at: datetime
    verified: bool
    
    class Config:
        from_attributes = True


# District endpoints
@router.post("/districts", response_model=DistrictResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
async def create_district(district: DistrictCreate, db: Session = Depends(get_db)):
    """Create a new district"""
    try:
        db_district = District(**district.model_dump())
        db.add(db_district)
        db.commit()
        db.refresh(db_district)
        logger.info(f"Created district: {db_district.name}")
        return db_district
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating district: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/districts", response_model=List[DistrictResponse])
async def list_districts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all districts"""
    districts = db.query(District).offset(skip).limit(limit).all()
    return districts


@router.get("/districts/{district_id}", response_model=DistrictResponse)
async def get_district(district_id: int, db: Session = Depends(get_db)):
    """Get a specific district"""
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return district


@router.put("/districts/{district_id}", response_model=DistrictResponse,
            dependencies=[Depends(require_admin)])
async def update_district(district_id: int, district: DistrictCreate, db: Session = Depends(get_db)):
    """Update a district"""
    db_district = db.query(District).filter(District.id == district_id).first()
    if not db_district:
        raise HTTPException(status_code=404, detail="District not found")
    
    for key, value in district.model_dump().items():
        setattr(db_district, key, value)
    
    db_district.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_district)
    logger.info(f"Updated district: {db_district.name}")
    return db_district


@router.delete("/districts/{district_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
async def delete_district(district_id: int, db: Session = Depends(get_db)):
    """Delete a district"""
    db_district = db.query(District).filter(District.id == district_id).first()
    if not db_district:
        raise HTTPException(status_code=404, detail="District not found")
    
    db.delete(db_district)
    db.commit()
    logger.info(f"Deleted district: {db_district.name}")


# Village endpoints
@router.post("/villages", response_model=VillageResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
async def create_village(village: VillageCreate, db: Session = Depends(get_db)):
    """Create a new village"""
    try:
        db_village = Village(**village.model_dump())
        db.add(db_village)
        db.commit()
        db.refresh(db_village)
        logger.info(f"Created village: {db_village.name}")
        return db_village
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating village: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/villages", response_model=List[VillageResponse])
async def list_villages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all villages"""
    villages = db.query(Village).offset(skip).limit(limit).all()
    return villages


@router.get("/villages/{village_id}", response_model=VillageResponse)
async def get_village(village_id: int, db: Session = Depends(get_db)):
    """Get a specific village"""
    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")
    return village


@router.put("/villages/{village_id}", response_model=VillageResponse,
            dependencies=[Depends(require_admin)])
async def update_village(village_id: int, village: VillageCreate, db: Session = Depends(get_db)):
    """Update a village"""
    db_village = db.query(Village).filter(Village.id == village_id).first()
    if not db_village:
        raise HTTPException(status_code=404, detail="Village not found")
    
    for key, value in village.model_dump().items():
        setattr(db_village, key, value)
    
    db_village.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_village)
    logger.info(f"Updated village: {db_village.name}")
    return db_village


@router.delete("/villages/{village_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
async def delete_village(village_id: int, db: Session = Depends(get_db)):
    """Delete a village"""
    db_village = db.query(Village).filter(Village.id == village_id).first()
    if not db_village:
        raise HTTPException(status_code=404, detail="Village not found")
    
    db.delete(db_village)
    db.commit()
    logger.info(f"Deleted village: {db_village.name}")


# Health Record endpoints
@router.post("/health-records", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_health_record(record: HealthRecordCreate, db: Session = Depends(get_db)):
    """Create a new health record"""
    try:
        db_record = HealthRecord(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        logger.info(f"Created health record for disease: {db_record.disease_type}")
        return db_record
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating health record: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/health-records", response_model=List[HealthRecordResponse])
async def list_health_records(
    skip: int = 0, 
    limit: int = 100, 
    village_id: int | None = None,
    disease_type: str | None = None,
    db: Session = Depends(get_db)
):
    """List all health records"""
    query = db.query(HealthRecord)
    if village_id:
        query = query.filter(HealthRecord.village_id == village_id)
    if disease_type:
        query = query.filter(HealthRecord.disease_type == disease_type)
    records = query.offset(skip).limit(limit).all()
    return records


@router.get("/health-records/{record_id}", response_model=HealthRecordResponse)
async def get_health_record(record_id: int, db: Session = Depends(get_db)):
    """Get a specific health record"""
    record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Health record not found")
    return record


@router.put("/health-records/{record_id}", response_model=HealthRecordResponse,
            dependencies=[Depends(require_admin)])
async def update_health_record(record_id: int, record: HealthRecordCreate, db: Session = Depends(get_db)):
    """Update a health record"""
    db_record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Health record not found")
    
    for key, value in record.model_dump().items():
        setattr(db_record, key, value)
    
    db_record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_record)
    logger.info(f"Updated health record: {db_record.id}")
    return db_record


@router.delete("/health-records/{record_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
async def delete_health_record(record_id: int, db: Session = Depends(get_db)):
    """Delete a health record"""
    db_record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Health record not found")
    
    db.delete(db_record)
    db.commit()
    logger.info(f"Deleted health record: {db_record.id}")


# ─── Predictive Patterns ────────────────────────────────────────────────────

class PredictivePatternCreate(BaseModel):
    disease_type: str = Field(..., min_length=1, max_length=100)
    pattern_description: str = Field(None)
    confidence_score: float = Field(None, ge=0.0, le=1.0)
    data_points_used: int = Field(None, ge=0)
    active: bool = True


class PredictivePatternResponse(BaseModel):
    id: int
    disease_type: str
    pattern_description: str | None
    confidence_score: float | None
    data_points_used: int | None
    active: bool
    last_updated: datetime

    class Config:
        from_attributes = True


@router.get("/patterns", response_model=List[PredictivePatternResponse])
async def list_patterns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all predictive patterns"""
    return db.query(PredictivePattern).offset(skip).limit(limit).all()


@router.get("/patterns/{pattern_id}", response_model=PredictivePatternResponse)
async def get_pattern(pattern_id: int, db: Session = Depends(get_db)):
    """Get a specific predictive pattern"""
    pattern = db.query(PredictivePattern).filter(PredictivePattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


@router.post("/patterns", response_model=PredictivePatternResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
async def create_pattern(pattern: PredictivePatternCreate, db: Session = Depends(get_db)):
    """Create a new predictive pattern"""
    db_pattern = PredictivePattern(**pattern.model_dump())
    db.add(db_pattern)
    db.commit()
    db.refresh(db_pattern)
    return db_pattern


@router.put("/patterns/{pattern_id}", response_model=PredictivePatternResponse,
            dependencies=[Depends(require_admin)])
async def update_pattern(pattern_id: int, pattern: PredictivePatternCreate, db: Session = Depends(get_db)):
    """Update a predictive pattern"""
    db_pattern = db.query(PredictivePattern).filter(PredictivePattern.id == pattern_id).first()
    if not db_pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    for key, value in pattern.model_dump().items():
        setattr(db_pattern, key, value)
    db_pattern.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(db_pattern)
    return db_pattern


@router.delete("/patterns/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
async def delete_pattern(pattern_id: int, db: Session = Depends(get_db)):
    """Delete a predictive pattern"""
    db_pattern = db.query(PredictivePattern).filter(PredictivePattern.id == pattern_id).first()
    if not db_pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    db.delete(db_pattern)
    db.commit()

