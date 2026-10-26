import uuid
import datetime as dt
from datetime import date, time, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    LoyaltyTier,
    ReservationStatus,
    BookingSource,
    PaymentMethod,
    DepositStatus,
    StaffRole,
    MaintenancePriority,
    MaintenanceStatus,
)


# ---------- Customer Schemas ----------

class CustomerBase(BaseModel):
    phone_number: str
    name: str = "Unknown"
    email: Optional[str] = None
    loyalty_tier: LoyaltyTier = LoyaltyTier.none
    preferred_pax: Optional[int] = None
    dietary_notes: Optional[str] = None
    birthday: Optional[dt.date] = None
    anniversary: Optional[dt.date] = None
    tags: Optional[list[str]] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    loyalty_tier: Optional[LoyaltyTier] = None
    preferred_pax: Optional[int] = None
    dietary_notes: Optional[str] = None
    birthday: Optional[dt.date] = None
    anniversary: Optional[dt.date] = None
    tags: Optional[list[str]] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    name: str
    email: Optional[str] = None
    total_visits: int
    lifetime_spend: float
    loyalty_tier: LoyaltyTier
    no_show_count: int
    preferred_pax: Optional[int] = None
    dietary_notes: Optional[str] = None
    birthday: Optional[dt.date] = None
    anniversary: Optional[dt.date] = None
    tags: Optional[list[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CustomerDetail(CustomerOut):
    reservations: list["ReservationWithTransactions"] = []


# ---------- Staff Schemas ----------

class StaffBase(BaseModel):
    name: str
    role: StaffRole = StaffRole.server
    phone_number: Optional[str] = None
    assigned_section: Optional[str] = None
    shift: str = "Evening (17:00 - 01:00)"
    is_active: bool = True


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[StaffRole] = None
    phone_number: Optional[str] = None
    assigned_section: Optional[str] = None
    shift: Optional[str] = None
    is_active: Optional[bool] = None


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    role: StaffRole
    phone_number: Optional[str] = None
    assigned_section: Optional[str] = None
    shift: str
    is_active: bool
    created_at: Optional[datetime] = None


class StaffPerformanceOut(StaffOut):
    reservations_handled: int = 0
    covers_served: int = 0
    revenue_generated: float = 0.0
    tips_earned: float = 0.0
    avg_rating: Optional[float] = None


# ---------- Transaction & POS Order Schemas ----------

class OrderItemInput(BaseModel):
    menu_item_id: Optional[str] = None
    name: str
    price: float
    quantity: int = Field(default=1, ge=1)


class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    tip_amount: float = Field(default=0.0, ge=0)
    payment_method: PaymentMethod = PaymentMethod.card
    pos_receipt_id: Optional[str] = None
    items_json: Optional[list[dict]] = None
    mark_completed: bool = True


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reservation_id: uuid.UUID
    pos_receipt_id: Optional[str] = None
    amount: float
    tip_amount: float = 0.0
    payment_method: PaymentMethod = PaymentMethod.card
    items_json: Optional[list[dict]] = None
    created_at: Optional[datetime] = None


# ---------- Reservation Schemas ----------

class ReservationBase(BaseModel):
    phone_number: str
    name: str = "Unknown"
    date: dt.date
    time: dt.time
    duration_minutes: int = Field(default=90, ge=30, le=360)
    pax: int = Field(..., ge=1)
    table_number: Optional[int] = None
    server_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    occasion: Optional[str] = None
    source: BookingSource = BookingSource.phone
    external_booking_ref: Optional[str] = None
    deposit_status: Optional[DepositStatus] = None


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    date: Optional[dt.date] = None
    time: Optional[dt.time] = None
    duration_minutes: Optional[int] = Field(default=None, ge=30, le=360)
    pax: Optional[int] = Field(default=None, ge=1)
    status: Optional[ReservationStatus] = None
    table_number: Optional[int] = None
    server_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    occasion: Optional[str] = None
    source: Optional[BookingSource] = None
    deposit_status: Optional[DepositStatus] = None
    guest_rating: Optional[int] = Field(default=None, ge=1, le=5)
    guest_feedback: Optional[str] = None


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    server_id: Optional[uuid.UUID] = None
    date: dt.date
    time: dt.time
    duration_minutes: int = 90
    pax: int
    status: ReservationStatus
    table_number: Optional[int] = None
    notes: Optional[str] = None
    occasion: Optional[str] = None
    source: BookingSource = BookingSource.phone
    external_booking_ref: Optional[str] = None
    min_spend_required: float = 0.0
    deposit_amount: float = 0.0
    deposit_status: DepositStatus = DepositStatus.none
    guest_rating: Optional[int] = None
    guest_feedback: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ReservationWithTransactions(ReservationOut):
    transactions: list[TransactionOut] = []


class ReservationWithCustomer(ReservationOut):
    customer: Optional[CustomerOut] = None
    server: Optional[StaffOut] = None
    transactions: list[TransactionOut] = []


# ---------- Table & Rate Rule Schemas ----------

class TableBase(BaseModel):
    table_number: int = Field(..., ge=1)
    capacity: int = Field(..., ge=1)
    section: str = "Main Dining"
    min_spend_per_pax: float = Field(default=0.0, ge=0)
    x_pos: float = 80.0
    y_pos: float = 80.0
    width: float = 90.0
    height: float = 90.0
    shape: str = "round"
    rotation: int = 0
    is_active: bool = True


class TableCreate(TableBase):
    pass


class TableUpdate(BaseModel):
    capacity: Optional[int] = Field(default=None, ge=1)
    section: Optional[str] = None
    min_spend_per_pax: Optional[float] = Field(default=None, ge=0)
    x_pos: Optional[float] = None
    y_pos: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    shape: Optional[str] = None
    rotation: Optional[int] = None
    is_active: Optional[bool] = None


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    table_number: int
    capacity: int
    section: str
    min_spend_per_pax: float = 0.0
    x_pos: float = 80.0
    y_pos: float = 80.0
    width: float = 90.0
    height: float = 90.0
    shape: str = "round"
    rotation: int = 0
    is_active: bool
    created_at: Optional[datetime] = None


class TableAvailabilityOut(TableOut):
    is_available: bool = True
    conflicting_reservation: Optional[ReservationWithCustomer] = None


class RateRuleBase(BaseModel):
    name: str
    section: str = "All"
    day_of_week: str = "Thu,Fri,Sat"
    start_time: dt.time = dt.time(19, 0)
    min_spend_per_pax: float = 0.0
    deposit_per_pax: float = 0.0
    min_party_size_for_deposit: int = 4
    is_active: bool = True


class RateRuleCreate(RateRuleBase):
    pass


class RateRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    section: str
    day_of_week: str
    start_time: dt.time
    min_spend_per_pax: float
    deposit_per_pax: float
    min_party_size_for_deposit: int
    is_active: bool
    created_at: Optional[datetime] = None


class RateQuoteOut(BaseModel):
    min_spend_required: float
    deposit_amount: float
    deposit_required: bool
    applied_rule: Optional[str] = None


# ---------- Menu / POS Schemas ----------

class MenuItemBase(BaseModel):
    name: str
    category: str = "Main Course"
    price: float = Field(..., gt=0)
    is_available: bool = True
    stock_quantity: int = Field(default=50, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    is_available: Optional[bool] = None
    stock_quantity: Optional[int] = Field(default=None, ge=0)


class MenuItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    price: float
    is_available: bool
    stock_quantity: int
    low_stock_threshold: int
    created_at: Optional[datetime] = None


# ---------- Accounting & Expense Schemas ----------

class ExpenseCreate(BaseModel):
    date: dt.date = Field(default_factory=dt.date.today)
    category: str = "Supplies"
    description: str
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.cash
    recorded_by: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    date: dt.date
    category: str
    description: str
    amount: float
    payment_method: PaymentMethod
    recorded_by: Optional[str] = None
    created_at: Optional[datetime] = None


class AccountingSummaryOut(BaseModel):
    gross_revenue: float
    total_tips: float
    total_expenses: float
    net_profit: float
    by_payment_method: dict[str, float]
    expenses_by_category: dict[str, float]
    transactions_count: int
    recent_expenses: list[ExpenseOut] = []


# ---------- Marketing & Guest Experience Schemas ----------

class CampaignCreate(BaseModel):
    name: str
    channel: str = "whatsapp"
    target_segment: str = "all"
    message_template: str


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    channel: str
    target_segment: str
    message_template: str
    recipients_count: int
    status: str
    created_at: Optional[datetime] = None


# ---------- Inventory & Maintenance Schemas ----------

class InventoryItemCreate(BaseModel):
    name: str
    category: str = "Produce"
    unit: str = "kg"
    current_stock: float = 0.0
    par_level: float = 10.0
    cost_per_unit: float = 0.0
    supplier: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    current_stock: Optional[float] = None
    par_level: Optional[float] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None


class InventoryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    unit: str
    current_stock: float
    par_level: float
    cost_per_unit: float
    supplier: Optional[str] = None
    updated_at: Optional[datetime] = None


class MaintenanceTicketCreate(BaseModel):
    equipment_name: str
    location: str = "Kitchen"
    issue_description: str
    priority: MaintenancePriority = MaintenancePriority.medium
    assigned_to: Optional[str] = None
    estimated_cost: float = 0.0


class MaintenanceTicketUpdate(BaseModel):
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    assigned_to: Optional[str] = None
    estimated_cost: Optional[float] = None


class MaintenanceTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    equipment_name: str
    location: str
    issue_description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    assigned_to: Optional[str] = None
    estimated_cost: float
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


# ---------- Online Booking & OTA Webhook Schemas ----------

class TimeSlotAvailabilityOut(BaseModel):
    time: str
    available_tables: int
    max_party_size: int
    min_spend_per_pax: float


class PublicBookingCreate(BaseModel):
    name: str
    phone_number: str
    email: Optional[str] = None
    date: dt.date
    time: dt.time
    pax: int = Field(..., ge=1, le=20)
    section_preference: Optional[str] = None
    occasion: Optional[str] = None
    dietary_notes: Optional[str] = None
    notes: Optional[str] = None
    source: BookingSource = BookingSource.online
    external_booking_ref: Optional[str] = None


class OTAWebhookPayload(BaseModel):
    provider: str = "OpenTable"
    external_ref: str
    guest_name: str
    guest_phone: str
    date: dt.date
    time: dt.time
    party_size: int = Field(..., ge=1)
    notes: Optional[str] = None
    occasion: Optional[str] = None


# ---------- Dashboard & Analytics Schemas ----------

class DashboardStats(BaseModel):
    total_reservations: int
    expected: int
    seated: int
    completed: int
    no_shows: int
    total_pax: int
    daily_revenue: float = 0.0
    vip_arrivals: int = 0
    low_stock_alerts: int = 0
    open_maintenance_tickets: int = 0


class TimelineSlot(BaseModel):
    time: str
    reservations: list[ReservationWithCustomer] = []


class AnalyticsReportOut(BaseModel):
    total_revenue: float
    total_reservations: int
    total_covers: int
    avg_spend_per_cover: float
    completion_rate: float
    no_show_rate: float
    avg_guest_rating: Optional[float] = None
    revenue_by_section: dict[str, float]
    bookings_by_source: dict[str, int]
    peak_hours: list[dict]
    top_customers: list[CustomerOut]
    staff_leaderboard: list[StaffPerformanceOut]


CustomerDetail.model_rebuild()
