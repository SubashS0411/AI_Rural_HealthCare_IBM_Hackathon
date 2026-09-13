from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import Intervention, Village

router = APIRouter()

class InterventionCreate(BaseModel):
    village_id: int
    resource_type: str
    description: str
    assigned_by: str
    risk_score_before: Optional[float] = None

class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    risk_score_after: Optional[float] = None

class InterventionResponse(BaseModel):
    id: int
    village_id: int
    resource_type: str
    description: str
    status: str
    assigned_by: str
    created_at: datetime
    completed_at: Optional[datetime]
    risk_score_before: Optional[float]
    risk_score_after: Optional[float]
    village_name: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/interventions", response_model=InterventionResponse)
async def create_intervention(intervention: InterventionCreate, db: Session = Depends(get_db)):
    db_intervention = Intervention(
        village_id=intervention.village_id,
        resource_type=intervention.resource_type,
        description=intervention.description,
        assigned_by=intervention.assigned_by,
        risk_score_before=intervention.risk_score_before,
        status="planned"
    )
    db.add(db_intervention)
    db.commit()
    db.refresh(db_intervention)
    
    # attach village name for response
    village = db.query(Village).filter(Village.id == db_intervention.village_id).first()
    response_data = db_intervention.__dict__.copy()
    response_data["village_name"] = village.name if village else "Unknown"
    
    return response_data

@router.get("/interventions", response_model=List[InterventionResponse])
async def list_interventions(
    village_id: Optional[int] = None, 
    status: Optional[str] = None,
    district_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Intervention).join(Village, Intervention.village_id == Village.id)
    
    if village_id is not None:
        query = query.filter(Intervention.village_id == village_id)
    if status is not None:
        query = query.filter(Intervention.status == status)
    if district_id is not None:
        query = query.filter(Village.district_id == district_id)
        
    interventions = query.all()
    
    results = []
    for inv in interventions:
        data = inv.__dict__.copy()
        data["village_name"] = inv.village.name if inv.village else "Unknown"
        results.append(data)
        
    return results

@router.put("/interventions/{intervention_id}", response_model=InterventionResponse)
async def update_intervention(intervention_id: int, update_data: InterventionUpdate, db: Session = Depends(get_db)):
    db_intervention = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not db_intervention:
        raise HTTPException(status_code=404, detail="Intervention not found")
        
    if update_data.description is not None:
        db_intervention.description = update_data.description
        
    if update_data.status is not None:
        # If transitioning to completed
        if update_data.status == "completed" and db_intervention.status != "completed":
            db_intervention.completed_at = datetime.utcnow()
            if update_data.risk_score_after is not None:
                db_intervention.risk_score_after = update_data.risk_score_after
        
        db_intervention.status = update_data.status
        
    db.commit()
    db.refresh(db_intervention)
    
    village = db.query(Village).filter(Village.id == db_intervention.village_id).first()
    response_data = db_intervention.__dict__.copy()
    response_data["village_name"] = village.name if village else "Unknown"
    
    return response_data
