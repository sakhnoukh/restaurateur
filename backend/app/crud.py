import uuid
from datetime import date
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, selectinload

from app.models import Customer, Reservation, ReservationStatus, LoyaltyTier
from app.schemas import CustomerCreate, CustomerUpdate, ReservationCreate, ReservationUpdate


# ---------- Customer CRUD ----------

def get_customers(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None) -> list[Customer]:
    stmt = select(Customer)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(Customer.name.ilike(pattern), Customer.phone_number.ilike(pattern)))
    stmt = stmt.order_by(Customer.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_customer(db: Session, customer_id: uuid.UUID) -> Optional[Customer]:
    stmt = select(Customer).options(selectinload(Customer.reservations)).where(Customer.id == customer_id)
    return db.execute(stmt).scalar_one_or_none()


def get_customer_by_phone(db: Session, phone_number: str) -> Optional[Customer]:
    stmt = select(Customer).where(Customer.phone_number == phone_number)
    return db.execute(stmt).scalar_one_or_none()


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer: Customer) -> None:
    db.delete(customer)
    db.commit()


# ---------- Reservation CRUD ----------

def get_reservations(
    db: Session,
    target_date: Optional[date] = None,
    status: Optional[ReservationStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Reservation]:
    stmt = select(Reservation).options(selectinload(Reservation.customer))
    if target_date:
        stmt = stmt.where(Reservation.date == target_date)
    if status:
        stmt = stmt.where(Reservation.status == status)
    stmt = stmt.order_by(Reservation.time.asc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_reservation(db: Session, reservation_id: uuid.UUID) -> Optional[Reservation]:
    stmt = (
        select(Reservation)
        .options(selectinload(Reservation.customer), selectinload(Reservation.transactions))
        .where(Reservation.id == reservation_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def create_reservation(db: Session, data: ReservationCreate) -> Reservation:
    customer = get_customer_by_phone(db, data.phone_number)
    if not customer:
        customer = Customer(
            phone_number=data.phone_number,
            name=data.name,
            preferred_pax=data.pax,
        )
        db.add(customer)
        db.flush()
    elif customer.preferred_pax is None:
        customer.preferred_pax = data.pax

    reservation = Reservation(
        customer_id=customer.id,
        date=data.date,
        time=data.time,
        pax=data.pax,
        status=ReservationStatus.expected,
        table_number=data.table_number,
        notes=data.notes,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def update_reservation(db: Session, reservation: Reservation, data: ReservationUpdate) -> Reservation:
    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data:
        new_status = update_data["status"]
        old_status = reservation.status

        if new_status == ReservationStatus.seated and old_status != ReservationStatus.seated:
            reservation.customer.total_visits += 1
        elif new_status == ReservationStatus.no_show and old_status != ReservationStatus.no_show:
            reservation.customer.no_show_count += 1

        reservation.status = new_status

    if "table_number" in update_data:
        reservation.table_number = update_data["table_number"]
    if "notes" in update_data:
        reservation.notes = update_data["notes"]

    db.commit()
    db.refresh(reservation)
    return reservation


def delete_reservation(db: Session, reservation: Reservation) -> None:
    db.delete(reservation)
    db.commit()


# ---------- Dashboard Stats ----------

def get_dashboard_stats(db: Session, target_date: date) -> dict:
    stmt = select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.date == target_date)
    reservations = list(db.execute(stmt).scalars().all())

    total = len(reservations)
    expected = sum(1 for r in reservations if r.status == ReservationStatus.expected)
    seated = sum(1 for r in reservations if r.status == ReservationStatus.seated)
    completed = sum(1 for r in reservations if r.status == ReservationStatus.completed)
    no_shows = sum(1 for r in reservations if r.status == ReservationStatus.no_show)
    total_pax = sum(r.pax for r in reservations)

    return {
        "total_reservations": total,
        "expected": expected,
        "seated": seated,
        "completed": completed,
        "no_shows": no_shows,
        "total_pax": total_pax,
    }


def get_timeline(db: Session, target_date: date) -> dict[str, list[Reservation]]:
    stmt = (
        select(Reservation)
        .options(selectinload(Reservation.customer))
        .where(Reservation.date == target_date)
        .order_by(Reservation.time.asc())
    )
    reservations = list(db.execute(stmt).scalars().all())

    timeline: dict[str, list[Reservation]] = {}
    for r in reservations:
        slot = r.time.strftime("%H:%M")
        timeline.setdefault(slot, []).append(r)
    return timeline
