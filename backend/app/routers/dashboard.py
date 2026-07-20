from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_stats(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: Session = Depends(get_db),
):
    return crud.get_dashboard_stats(db, target_date)


@router.get("/timeline", response_model=list[schemas.TimelineSlot])
def get_timeline(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: Session = Depends(get_db),
):
    timeline = crud.get_timeline(db, target_date)
    result = []
    for slot, reservations in sorted(timeline.items()):
        result.append(schemas.TimelineSlot(
            time=slot,
            reservations=[schemas.ReservationWithCustomer.model_validate(r) for r in reservations],
        ))
    return result
