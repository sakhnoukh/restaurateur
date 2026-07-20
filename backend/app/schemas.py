import uuid
from datetime import date, time, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models import LoyaltyTier, ReservationStatus


# ---------- Customer Schemas ----------

class CustomerBase(BaseModel):
    phone_number: str
    name: str = "Unknown"
    loyalty_tier: LoyaltyTier = LoyaltyTier.none
    tags: Optional[list[str]] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    loyalty_tier: Optional[LoyaltyTier] = None
    tags: Optional[list[str]] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    name: str
    total_visits: int
    lifetime_spend: float
    loyalty_tier: LoyaltyTier
    no_show_count: int
    preferred_pax: Optional[int] = None
    tags: Optional[list[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CustomerDetail(CustomerOut):
    reservations: list["ReservationOut"] = []


# ---------- Reservation Schemas ----------

class ReservationBase(BaseModel):
    phone_number: str
    name: str = "Unknown"
    date: date
    time: time
    pax: int
    table_number: Optional[int] = None
    notes: Optional[str] = None


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None
    table_number: Optional[int] = None
    notes: Optional[str] = None


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    date: date
    time: time
    pax: int
    status: ReservationStatus
    table_number: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ReservationWithCustomer(ReservationOut):
    customer: Optional[CustomerOut] = None


# ---------- Dashboard Schemas ----------

class DashboardStats(BaseModel):
    total_reservations: int
    expected: int
    seated: int
    completed: int
    no_shows: int
    total_pax: int


class TimelineSlot(BaseModel):
    time: str
    reservations: list[ReservationWithCustomer] = []


# ---------- Transaction Schemas ----------

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reservation_id: uuid.UUID
    pos_receipt_id: Optional[str] = None
    amount: float
    created_at: Optional[datetime] = None


CustomerDetail.model_rebuild()
