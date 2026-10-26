import enum
import uuid
from datetime import datetime, date, time

from sqlalchemy import (
    String,
    Integer,
    Float,
    Date,
    Time,
    Enum,
    ForeignKey,
    Text,
    DateTime,
    Boolean,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base


class StringArray(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(Text))
        return dialect.type_descriptor(JSON)


class LoyaltyTier(str, enum.Enum):
    none = "none"
    silver = "silver"
    gold = "gold"
    vip = "vip"


class ReservationStatus(str, enum.Enum):
    pending = "pending"
    expected = "expected"
    seated = "seated"
    completed = "completed"
    no_show = "no_show"


class BookingSource(str, enum.Enum):
    phone = "phone"
    walk_in = "walk_in"
    online = "online"
    whatsapp = "whatsapp"
    ota = "ota"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    instapay = "instapay"
    wallet = "wallet"


class DepositStatus(str, enum.Enum):
    none = "none"
    required = "required"
    paid = "paid"
    refunded = "refunded"


class StaffRole(str, enum.Enum):
    manager = "manager"
    host = "host"
    server = "server"
    chef = "chef"


class MaintenancePriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class MaintenanceStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="Unknown")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    lifetime_spend: Mapped[float] = mapped_column(Float, default=0.0)
    loyalty_tier: Mapped[LoyaltyTier] = mapped_column(Enum(LoyaltyTier), default=LoyaltyTier.none)
    no_show_count: Mapped[int] = mapped_column(Integer, default=0)
    preferred_pax: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dietary_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    anniversary: Mapped[date | None] = mapped_column(Date, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(StringArray, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole), default=StaffRole.server)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    assigned_section: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shift: Mapped[str] = mapped_column(String(100), default="Evening (17:00 - 01:00)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="server")


class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_number: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    capacity: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(100), default="Main Dining")
    min_spend_per_pax: Mapped[float] = mapped_column(Float, default=0.0)
    x_pos: Mapped[float] = mapped_column(Float, default=80.0)
    y_pos: Mapped[float] = mapped_column(Float, default=80.0)
    width: Mapped[float] = mapped_column(Float, default=90.0)
    height: Mapped[float] = mapped_column(Float, default=90.0)
    shape: Mapped[str] = mapped_column(String(30), default="round")
    rotation: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RateRule(Base):
    __tablename__ = "rate_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    section: Mapped[str] = mapped_column(String(100), default="All")
    day_of_week: Mapped[str] = mapped_column(String(50), default="Thu,Fri,Sat")
    start_time: Mapped[time] = mapped_column(Time, default=time(19, 0))
    min_spend_per_pax: Mapped[float] = mapped_column(Float, default=0.0)
    deposit_per_pax: Mapped[float] = mapped_column(Float, default=0.0)
    min_party_size_for_deposit: Mapped[int] = mapped_column(Integer, default=4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    server_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff.id", ondelete="SET NULL"), nullable=True, index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[time] = mapped_column(Time)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90)
    pax: Mapped[int] = mapped_column(Integer)
    status: Mapped[ReservationStatus] = mapped_column(Enum(ReservationStatus), default=ReservationStatus.pending)
    table_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[BookingSource] = mapped_column(Enum(BookingSource), default=BookingSource.phone)
    external_booking_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    min_spend_required: Mapped[float] = mapped_column(Float, default=0.0)
    deposit_amount: Mapped[float] = mapped_column(Float, default=0.0)
    deposit_status: Mapped[DepositStatus] = mapped_column(Enum(DepositStatus), default=DepositStatus.none)
    guest_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    guest_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="reservations")
    server: Mapped["Staff | None"] = relationship(back_populates="reservations")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="reservation", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reservations.id", ondelete="CASCADE"), index=True)
    pos_receipt_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[float] = mapped_column(Float)
    tip_amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.card)
    items_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reservation: Mapped["Reservation"] = relationship(back_populates="transactions")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), default="Main Course")
    price: Mapped[float] = mapped_column(Float)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=50)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, index=True, default=date.today)
    category: Mapped[str] = mapped_column(String(100), default="Supplies")
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Float)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.cash)
    recorded_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    channel: Mapped[str] = mapped_column(String(50), default="whatsapp")
    target_segment: Mapped[str] = mapped_column(String(100), default="all")
    message_template: Mapped[str] = mapped_column(Text)
    recipients_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), default="Produce")
    unit: Mapped[str] = mapped_column(String(50), default="kg")
    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    par_level: Mapped[float] = mapped_column(Float, default=10.0)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(100), default="Kitchen")
    issue_description: Mapped[str] = mapped_column(Text)
    priority: Mapped[MaintenancePriority] = mapped_column(Enum(MaintenancePriority), default=MaintenancePriority.medium)
    status: Mapped[MaintenanceStatus] = mapped_column(Enum(MaintenanceStatus), default=MaintenanceStatus.open)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
