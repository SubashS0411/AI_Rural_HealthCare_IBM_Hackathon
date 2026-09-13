from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class District(Base):
    """District health administrative unit"""
    __tablename__ = "districts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False)
    population = Column(Integer)
    area_sq_km = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    villages = relationship("Village", back_populates="district", cascade="all, delete-orphan")
    health_records = relationship("HealthRecord", back_populates="district")


class Village(Base):
    """Village cluster within a district"""
    __tablename__ = "villages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    population = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    district = relationship("District", back_populates="villages")
    health_records = relationship("HealthRecord", back_populates="village")


class HealthRecord(Base):
    """Health observation and intervention records"""
    __tablename__ = "health_records"
    
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False)
    
    # Disease information
    disease_type = Column(String(100), nullable=False, index=True)
    case_count = Column(Integer, default=0)
    severity_level = Column(String(20))  # low, medium, high, critical
    
    # Intervention details
    intervention_type = Column(String(100))
    intervention_date = Column(DateTime)
    intervention_notes = Column(Text)
    
    # Outcomes
    outcome_status = Column(String(50))  # pending, successful, partial, failed
    outcome_notes = Column(Text)
    
    # Metadata
    recorded_by = Column(String(100))  # Field health worker
    recorded_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    district = relationship("District", back_populates="health_records")
    village = relationship("Village", back_populates="health_records")


class PredictivePattern(Base):
    """Disease prevention patterns learned from data"""
    __tablename__ = "predictive_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    disease_type = Column(String(100), nullable=False, index=True)
    pattern_description = Column(Text)
    confidence_score = Column(Float)  # 0.0 to 1.0
    
    # Pattern metadata
    data_points_used = Column(Integer)
    last_updated = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# User model for authentication
class User(Base):
    """Application user with credentials"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="worker", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Optional relationship to health records can be added later


class VillageResource(Base):
    """
    Per-village resource metrics used for risk scoring.
    NOTE: staff_count, staff_required, medicine_stock_pct, and
    infrastructure_score are ILLUSTRATIVE SAMPLE DATA seeded for the demo
    — they are not sourced from live field data.
    """
    __tablename__ = "village_resources"

    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False, unique=True)
    staff_count = Column(Integer, nullable=False, default=0)
    staff_required = Column(Integer, nullable=False, default=5)
    medicine_stock_pct = Column(Float, nullable=False, default=50.0)  # 0-100
    infrastructure_score = Column(Float, nullable=False, default=50.0)  # 0-100

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    village = relationship("Village", backref="resource")


class MedicineRequest(Base):
    """Field request for medicine resupply"""
    __tablename__ = "medicine_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False, index=True)
    medicine_name = Column(String(200), nullable=False)
    quantity_needed = Column(Integer, nullable=False)
    urgency = Column(String(50), nullable=False) # low/medium/high/critical
    requested_by = Column(String(100), nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="pending") # pending/approved/fulfilled/rejected
    notes = Column(Text, nullable=True)

    village = relationship("Village", backref="medicine_requests")


class IncidentReport(Base):
    """Immediate field report for outbreaks/emergencies"""
    __tablename__ = "incident_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False, index=True)
    incident_type = Column(String(100), nullable=False) # disease_outbreak/injury/environmental/other
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False) # low/medium/high/critical
    reported_by = Column(String(100), nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="open") # open/acknowledged/resolved

    village = relationship("Village", backref="incident_reports")
class Intervention(Base):
    """Planned or completed intervention for a village"""
    __tablename__ = "interventions"
    
    id = Column(Integer, primary_key=True, index=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False) # specialist/mmu/medicine/testing_kits/awareness/vector_control
    description = Column(Text, nullable=False)
    status = Column(String(20), default="planned", nullable=False) # planned/in_progress/completed
    assigned_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    risk_score_before = Column(Float, nullable=True)
    risk_score_after = Column(Float, nullable=True)

    village = relationship("Village", backref="interventions")
