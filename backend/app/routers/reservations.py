from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.database import get_db
from app import crud, schemas
from app.models import ReservationStatus

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("/", response_model=list[schemas.ReservationWithCustomer])
def list_reservations(
    target_date: Optional[date] = Query(None, alias="date", description="Filter by date (YYYY-MM-DD)"),
    status: Optional[ReservationStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.get_reservations(db, target_date=target_date, status=status, skip=skip, limit=limit)


@router.get("/{reservation_id}", response_model=schemas.ReservationWithCustomer)
def get_reservation(reservation_id: str, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.post("/", response_model=schemas.ReservationWithCustomer, status_code=201)
def create_reservation(data: schemas.ReservationCreate, db: Session = Depends(get_db)):
    reservation = crud.create_reservation(db, data)
    return crud.get_reservation(db, reservation.id)


@router.patch("/{reservation_id}", response_model=schemas.ReservationWithCustomer)
def update_reservation(reservation_id: str, data: schemas.ReservationUpdate, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return crud.update_reservation(db, reservation, data)


@router.delete("/{reservation_id}", status_code=204)
def delete_reservation(reservation_id: str, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    crud.delete_reservation(db, reservation)
