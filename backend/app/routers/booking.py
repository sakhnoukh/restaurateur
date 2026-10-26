from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas
from app.models import BookingSource

router = APIRouter(prefix="/booking", tags=["online booking & ota"])


@router.get("/slots", response_model=list[schemas.TimeSlotAvailabilityOut])
def get_available_slots(
    target_date: date = Query(default_factory=date.today, alias="date"),
    pax: int = Query(default=2, ge=1, le=20),
    section: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_public_slots_availability(db, target_date=target_date, pax=pax, section_preference=section)


@router.post("/reserve", response_model=schemas.ReservationWithCustomer, status_code=201)
def create_online_booking(data: schemas.PublicBookingCreate, db: Session = Depends(get_db)):
    res = crud.create_public_booking(db, data)
    return crud.get_reservation(db, res.id)


@router.post("/ota-webhook", response_model=schemas.ReservationWithCustomer, status_code=201)
def receive_ota_booking_webhook(payload: schemas.OTAWebhookPayload, db: Session = Depends(get_db)):
    booking_data = schemas.PublicBookingCreate(
        name=payload.guest_name,
        phone_number=payload.guest_phone,
        date=payload.date,
        time=payload.time,
        pax=payload.party_size,
        occasion=payload.occasion,
        notes=f"[{payload.provider}] {payload.notes or ''}".strip(),
        source=BookingSource.ota,
        external_booking_ref=f"{payload.provider.upper()}-{payload.external_ref}",
    )
    res = crud.create_public_booking(db, booking_data)
    return crud.get_reservation(db, res.id)
