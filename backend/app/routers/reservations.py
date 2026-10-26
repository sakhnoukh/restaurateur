import uuid as uuid_mod
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas
from app.models import ReservationStatus

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _validate_table_assignment(
    db: Session,
    table_number: Optional[int],
    target_date: date,
    target_time,
    pax: int,
    exclude_reservation_id: Optional[uuid_mod.UUID] = None,
) -> None:
    if table_number is None:
        return
    table = crud.get_table_by_number(db, table_number)
    if table:
        if not table.is_active:
            raise HTTPException(status_code=400, detail=f"Table {table_number} is currently inactive")
        if table.capacity < pax:
            raise HTTPException(
                status_code=400,
                detail=f"Table {table_number} capacity ({table.capacity}) is smaller than party size ({pax})",
            )
    conflict = crud.find_table_conflict(
        db,
        table_number=table_number,
        target_date=target_date,
        target_time=target_time,
        exclude_reservation_id=exclude_reservation_id,
    )
    if conflict:
        guest_name = conflict.customer.name if conflict.customer else "another guest"
        raise HTTPException(
            status_code=409,
            detail=f"Table {table_number} is already booked around {conflict.time.strftime('%H:%M')} for {guest_name}",
        )


@router.get("", response_model=list[schemas.ReservationWithCustomer])
@router.get("/", response_model=list[schemas.ReservationWithCustomer], include_in_schema=False)
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
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.post("", response_model=schemas.ReservationWithCustomer, status_code=201)
@router.post("/", response_model=schemas.ReservationWithCustomer, status_code=201, include_in_schema=False)
def create_reservation(data: schemas.ReservationCreate, db: Session = Depends(get_db)):
    _validate_table_assignment(db, data.table_number, data.date, data.time, data.pax)
    reservation = crud.create_reservation(db, data)
    return crud.get_reservation(db, reservation.id)


@router.patch("/{reservation_id}", response_model=schemas.ReservationWithCustomer)
def update_reservation(reservation_id: str, data: schemas.ReservationUpdate, db: Session = Depends(get_db)):
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    update_fields = data.model_dump(exclude_unset=True)
    target_table = update_fields.get("table_number", reservation.table_number)
    target_date = update_fields.get("date", reservation.date)
    target_time = update_fields.get("time", reservation.time)
    target_pax = update_fields.get("pax", reservation.pax)
    target_status = update_fields.get("status", reservation.status)

    if target_table is not None and target_status in (
        ReservationStatus.pending,
        ReservationStatus.expected,
        ReservationStatus.seated,
    ):
        if any(k in update_fields for k in ("table_number", "date", "time", "pax")):
            _validate_table_assignment(
                db,
                table_number=target_table,
                target_date=target_date,
                target_time=target_time,
                pax=target_pax,
                exclude_reservation_id=reservation.id,
            )

    crud.update_reservation(db, reservation, data)
    return crud.get_reservation(db, reservation.id)


@router.delete("/{reservation_id}", status_code=204)
def delete_reservation(reservation_id: str, db: Session = Depends(get_db)):
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    crud.delete_reservation(db, reservation)


@router.post("/{reservation_id}/transactions", response_model=schemas.TransactionOut, status_code=201)
def record_reservation_transaction(
    reservation_id: str,
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
):
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return crud.create_transaction(db, reservation, data)


@router.get("/{reservation_id}/transactions", response_model=list[schemas.TransactionOut])
def list_reservation_transactions(reservation_id: str, db: Session = Depends(get_db)):
    try:
        rid = uuid_mod.UUID(reservation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
    reservation = crud.get_reservation(db, rid)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return crud.get_reservation_transactions(db, rid)
