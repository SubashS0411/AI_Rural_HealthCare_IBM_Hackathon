from backend.database import SessionLocal
from backend.models import Village, HealthRecord
from datetime import datetime, timedelta

db = SessionLocal()
try:
    village = db.query(Village).filter(Village.code == 'RGP-01').first()
    if village:
        # Add a 3rd and 4th Malaria record
        db.add(HealthRecord(
            district_id=village.district_id,
            village_id=village.id,
            disease_type='Malaria',
            case_count=50,
            severity_level='high',
            recorded_by='Worker A',
            recorded_at=datetime.utcnow() - timedelta(days=20),
            outcome_status='pending',
        ))
        db.add(HealthRecord(
            district_id=village.district_id,
            village_id=village.id,
            disease_type='Malaria',
            case_count=70,
            severity_level='critical',
            recorded_by='Worker A',
            recorded_at=datetime.utcnow() - timedelta(days=2),
            outcome_status='pending',
        ))
        
    village2 = db.query(Village).filter(Village.code == 'RGP-03').first()
    if village2:
        # Add 3rd Tuberculosis record
        db.add(HealthRecord(
            district_id=village2.district_id,
            village_id=village2.id,
            disease_type='Tuberculosis',
            case_count=40,
            severity_level='critical',
            recorded_by='Worker D',
            recorded_at=datetime.utcnow() - timedelta(days=5),
            outcome_status='pending',
        ))
        
    db.commit()
    print("Added extra records for training.")
finally:
    db.close()
