"""
risk.py — Risk scoring, village ranking, and what-if simulation endpoints.

The composite risk score formula and the underlying resource data
(VillageResource) are ILLUSTRATIVE SAMPLE DATA for the demo.
Formula weights:
  Disease load/severity  35%
  Staff vacancy %        25%
  Medicine stock gap     25%
  Seasonal/trend factor  15%
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field

from backend.database import get_db
from backend.models import District, Village, HealthRecord, VillageResource, IncidentReport
from backend.dependencies import get_current_user, require_officer_or_above

router = APIRouter(dependencies=[Depends(get_current_user)])


# ── helpers ──────────────────────────────────────────────────────────────────

SEVERITY_WEIGHT = {"low": 0.5, "medium": 1.0, "high": 1.5, "critical": 2.0}


def _disease_score(records: list) -> float:
    """0-100 score from case count weighted by severity."""
    if not records:
        return 0.0
    total = sum(
        r.case_count * SEVERITY_WEIGHT.get(r.severity_level or "low", 1.0)
        for r in records
    )
    # Clamp: 100 weighted cases → score 100
    return min(total / 1.0, 100.0)


def _staff_vacancy_score(res: Optional[VillageResource]) -> float:
    """Higher score = worse vacancy. 0 = fully staffed, 100 = no staff."""
    if res is None or res.staff_required == 0:
        return 50.0
    vacancy_pct = max(0, res.staff_required - res.staff_count) / res.staff_required
    return vacancy_pct * 100.0


def _medicine_gap_score(res: Optional[VillageResource]) -> float:
    """Higher score = worse stock gap. 0 = fully stocked, 100 = empty."""
    if res is None:
        return 50.0
    return max(0.0, 100.0 - res.medicine_stock_pct)


def _trend_score(records: list) -> float:
    """
    Seasonal / trend factor: compares the most-recent 3 records to the 3 before them.
    Rising trend → higher score (0-100).
    """
    if len(records) < 2:
        return 25.0  # neutral when insufficient data
    sorted_r = sorted(records, key=lambda r: r.recorded_at)
    # Limit to last 6 records for the trend window (recent 3 vs older 3)
    window = sorted_r[-6:]
    split = max(1, len(window) // 2)
    older_avg = sum(r.case_count for r in window[:split]) / split
    recent_avg = sum(r.case_count for r in window[split:]) / (len(window) - split)
    if older_avg == 0:
        return 50.0 if recent_avg == 0 else 100.0
    ratio = recent_avg / older_avg  # 1.0 = flat, >1 = rising
    return min(ratio * 50.0, 100.0)


def _compute_risk(
    records: list,
    res: Optional[VillageResource],
    override: dict | None = None,
) -> dict:
    """
    Returns composite score (0-100) and per-factor breakdown.
    override = {"staff_count": x, "medicine_stock_pct": y} for simulation.
    """
    # Apply any simulation overrides
    eff_res = res
    if override:
        from copy import copy
        if res is not None:
            eff_res = copy(res)
        else:
            # Create a synthetic neutral resource so override logic runs
            eff_res = VillageResource(
                village_id=0,
                staff_count=0,
                staff_required=4,
                medicine_stock_pct=50.0,
                infrastructure_score=50.0,
            )
        if "staff_count" in override:
            eff_res.staff_count = min(
                eff_res.staff_required,
                eff_res.staff_count + override["staff_count"],
            )
        if "medicine_stock_pct" in override:
            eff_res.medicine_stock_pct = min(
                100.0,
                eff_res.medicine_stock_pct + override["medicine_stock_pct"],
            )

    disease = _disease_score(records)
    staff = _staff_vacancy_score(eff_res)
    medicine = _medicine_gap_score(eff_res)
    trend = _trend_score(records)

    composite = (
        disease * 0.35
        + staff * 0.25
        + medicine * 0.25
        + trend * 0.15
    )

    factors = {
        "disease_load": round(disease, 1),
        "staff_vacancy": round(staff, 1),
        "medicine_gap": round(medicine, 1),
        "trend": round(trend, 1),
    }
    dominant = max(factors, key=lambda k: factors[k])

    return {
        "composite_score": round(composite, 1),
        "factors": factors,
        "dominant_driver": dominant,
        "weights": {
            "disease_load": 35,
            "staff_vacancy": 25,
            "medicine_gap": 25,
            "trend": 15,
        },
    }


def _recommendation(dominant: str, res: Optional[VillageResource]) -> str:
    if dominant == "disease_load":
        return "High disease burden detected — recommend immediate field investigation and targeted treatment camp."
    if dominant == "staff_vacancy":
        shortage = (res.staff_required - res.staff_count) if res else 2
        return f"Staffing gap detected ({shortage} position(s) vacant) — recommend deploying {max(1, shortage)} specialist(s)."
    if dominant == "medicine_gap":
        return "Medicine stock critically low — recommend restocking essential supplies and disease-relevant medications."
    if dominant == "trend":
        return "Rising case trend detected — recommend proactive screening and preventive outreach in this village."
    return "Monitor situation and continue routine health checks."


# ── endpoints ─────────────────────────────────────────────────────────────────


@router.get("/villages/{village_id}/risk-score")
def get_village_risk_score(village_id: int, db: Session = Depends(get_db)):
    """
    Compute a transparent weighted composite risk score (0-100) for a village.
    Formula: disease 35% + staff vacancy 25% + medicine gap 25% + trend 15%.
    NOTE: Resource data is illustrative sample data for the demo.
    """
    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")

    records = (
        db.query(HealthRecord)
        .filter(HealthRecord.village_id == village_id)
        .order_by(HealthRecord.recorded_at)
        .all()
    )
    res = db.query(VillageResource).filter(VillageResource.village_id == village_id).first()

    result = _compute_risk(records, res)

    # Incident Override Logic
    active_inc = db.query(IncidentReport).filter(
        IncidentReport.village_id == village_id,
        IncidentReport.status == "open",
        IncidentReport.severity.in_(["high", "critical"])
    ).first()

    result["active_incident"] = bool(active_inc)
    if active_inc:
        result["composite_score"] = max(result["composite_score"], 95.0)

    result["recommendation"] = _recommendation(result["dominant_driver"], res)
    result["village_id"] = village_id
    result["village_name"] = village.name
    result["note"] = "Score formula and resource data are illustrative sample data."
    return result


@router.get("/districts/{district_id}/ranking")
def get_district_ranking(district_id: int, db: Session = Depends(get_db)):
    """
    Return all villages in a district sorted by descending composite risk score,
    with each village's dominant driver.
    Batch-loads records and resources in 3 queries (not 2N+1).
    """
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    villages = db.query(Village).filter(Village.district_id == district_id).all()
    if not villages:
        return {
            "district_id": district_id,
            "district_name": district.name,
            "villages": [],
            "note": "No villages found in this district.",
        }

    village_ids = [v.id for v in villages]

    # Batch-load all health records and resources for the district in 2 queries
    all_records = (
        db.query(HealthRecord)
        .filter(HealthRecord.village_id.in_(village_ids))
        .order_by(HealthRecord.recorded_at)
        .all()
    )
    all_resources = (
        db.query(VillageResource)
        .filter(VillageResource.village_id.in_(village_ids))
        .all()
    )
    all_incidents = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.village_id.in_(village_ids),
            IncidentReport.status == "open",
            IncidentReport.severity.in_(["high", "critical"])
        )
        .all()
    )

    # Build lookup maps
    records_by_village: dict[int, list] = {vid: [] for vid in village_ids}
    for r in all_records:
        records_by_village[r.village_id].append(r)

    resources_by_village: dict[int, Optional[VillageResource]] = {vid: None for vid in village_ids}
    for res in all_resources:
        resources_by_village[res.village_id] = res

    open_incidents: set[int] = {inc.village_id for inc in all_incidents}

    ranking = []
    for v in villages:
        records = records_by_village[v.id]
        res = resources_by_village[v.id]
        risk = _compute_risk(records, res)

        active_incident = v.id in open_incidents
        composite_score = risk["composite_score"]
        if active_incident:
            composite_score = max(composite_score, 95.0)

        ranking.append(
            {
                "village_id": v.id,
                "village_name": v.name,
                "latitude": v.latitude,
                "longitude": v.longitude,
                "population": v.population,
                "composite_score": composite_score,
                "active_incident": active_incident,
                "dominant_driver": risk["dominant_driver"],
                "factors": risk["factors"],
                "recommendation": _recommendation(risk["dominant_driver"], res),
                "staff_count": res.staff_count if res else None,
                "staff_required": res.staff_required if res else None,
                "medicine_stock_pct": res.medicine_stock_pct if res else None,
                "infrastructure_score": res.infrastructure_score if res else None,
            }
        )
    ranking.sort(key=lambda x: x["composite_score"], reverse=True)
    for i, r in enumerate(ranking, 1):
        r["rank"] = i

    return {
        "district_id": district_id,
        "district_name": district.name,
        "villages": ranking,
        "note": "Score formula and resource data are illustrative sample data.",
    }


class SimulateRequest(BaseModel):
    # Validate non-negative inputs: additions cannot be negative
    add_staff: int = Field(default=0, ge=0, description="Number of additional staff to simulate (>= 0)")
    add_medicine_stock_pct: float = Field(
        default=0.0, ge=0.0, le=100.0,
        description="Additional medicine stock percentage to simulate (0-100)"
    )


@router.post("/villages/{village_id}/simulate", dependencies=[Depends(require_officer_or_above)])
def simulate_village(
    village_id: int, body: SimulateRequest, db: Session = Depends(get_db)
):
    """
    What-if simulator: accepts hypothetical staff/medicine changes and returns
    before/after composite risk score. Pure recalculation — no DB writes.
    Restricted to officers and admins.
    """
    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")

    records = (
        db.query(HealthRecord)
        .filter(HealthRecord.village_id == village_id)
        .order_by(HealthRecord.recorded_at)
        .all()
    )
    res = db.query(VillageResource).filter(VillageResource.village_id == village_id).first()

    before = _compute_risk(records, res)
    after = _compute_risk(
        records,
        res,
        override={"staff_count": body.add_staff, "medicine_stock_pct": body.add_medicine_stock_pct},
    )
    delta = round(before["composite_score"] - after["composite_score"], 1)

    return {
        "village_id": village_id,
        "village_name": village.name,
        "before": before,
        "after": after,
        "score_improvement": delta,
        "changes_applied": {
            "add_staff": body.add_staff,
            "add_medicine_stock_pct": body.add_medicine_stock_pct,
        },
        "note": "Simulation uses illustrative sample data. No data was persisted.",
    }
