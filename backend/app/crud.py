import uuid
from datetime import date, time, datetime
from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Customer,
    Reservation,
    Transaction,
    RestaurantTable,
    Staff,
    RateRule,
    MenuItem,
    Expense,
    Campaign,
    InventoryItem,
    MaintenanceTicket,
    ReservationStatus,
    LoyaltyTier,
    DepositStatus,
    MaintenanceStatus,
)
from app.schemas import (
    CustomerCreate,
    CustomerUpdate,
    ReservationCreate,
    ReservationUpdate,
    TransactionCreate,
    TableCreate,
    TableUpdate,
    StaffCreate,
    StaffUpdate,
    RateRuleCreate,
    MenuItemCreate,
    MenuItemUpdate,
    ExpenseCreate,
    CampaignCreate,
    InventoryItemCreate,
    InventoryItemUpdate,
    MaintenanceTicketCreate,
    MaintenanceTicketUpdate,
    PublicBookingCreate,
)

TIER_RANK = {
    LoyaltyTier.none: 0,
    LoyaltyTier.silver: 1,
    LoyaltyTier.gold: 2,
    LoyaltyTier.vip: 3,
}

TIER_TAG = {
    LoyaltyTier.silver: "Silver",
    LoyaltyTier.gold: "Gold",
    LoyaltyTier.vip: "VIP",
}


def compute_loyalty_tier(total_visits: int, lifetime_spend: float) -> LoyaltyTier:
    if lifetime_spend >= 40000 or total_visits >= 20:
        return LoyaltyTier.vip
    if lifetime_spend >= 15000 or total_visits >= 12:
        return LoyaltyTier.gold
    if lifetime_spend >= 5000 or total_visits >= 5:
        return LoyaltyTier.silver
    return LoyaltyTier.none


def sync_customer_loyalty(customer: Customer) -> None:
    computed = compute_loyalty_tier(customer.total_visits, customer.lifetime_spend)
    if TIER_RANK[computed] > TIER_RANK[customer.loyalty_tier]:
        customer.loyalty_tier = computed

    tags = list(customer.tags or [])
    tier_tag = TIER_TAG.get(customer.loyalty_tier)
    if tier_tag and tier_tag not in tags:
        for old_tag in ("Silver", "Gold", "VIP"):
            if old_tag in tags and old_tag != tier_tag:
                tags.remove(old_tag)
        tags.append(tier_tag)

    if customer.total_visits >= 10 and "Regular" not in tags:
        tags.append("Regular")
    if customer.no_show_count >= 2 and "Frequent No-Show" not in tags:
        tags.append("Frequent No-Show")
    elif customer.no_show_count < 2 and "Frequent No-Show" in tags:
        tags.remove("Frequent No-Show")

    customer.tags = tags if tags else None


# ---------- Customer CRUD ----------

def get_customers(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None) -> list[Customer]:
    stmt = select(Customer)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(Customer.name.ilike(pattern), Customer.phone_number.ilike(pattern)))
    stmt = stmt.order_by(Customer.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_customer(db: Session, customer_id: uuid.UUID) -> Optional[Customer]:
    stmt = (
        select(Customer)
        .options(selectinload(Customer.reservations).selectinload(Reservation.transactions))
        .where(Customer.id == customer_id)
    )
    customer = db.execute(stmt).scalar_one_or_none()
    if customer:
        customer.reservations.sort(key=lambda r: (r.date, r.time), reverse=True)
    return customer


def get_customer_by_phone(db: Session, phone_number: str) -> Optional[Customer]:
    stmt = select(Customer).where(Customer.phone_number == phone_number.strip())
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


# ---------- Rate Management & Minimum Spend Logic ----------

def get_rate_rules(db: Session, active_only: bool = False) -> list[RateRule]:
    stmt = select(RateRule)
    if active_only:
        stmt = stmt.where(RateRule.is_active.is_(True))
    stmt = stmt.order_by(RateRule.min_spend_per_pax.desc())
    return list(db.execute(stmt).scalars().all())


def create_rate_rule(db: Session, data: RateRuleCreate) -> RateRule:
    rule = RateRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def delete_rate_rule(db: Session, rule_id: uuid.UUID) -> bool:
    rule = db.execute(select(RateRule).where(RateRule.id == rule_id)).scalar_one_or_none()
    if not rule:
        return False
    db.delete(rule)
    db.commit()
    return True


def calculate_rate_quote(
    db: Session,
    target_date: date,
    target_time: time,
    pax: int,
    table_number: Optional[int] = None,
    section: Optional[str] = None,
    customer_no_shows: int = 0,
) -> dict:
    min_spend_per_pax = 0.0
    deposit_per_pax = 0.0
    applied_rule_name = None

    resolved_section = section
    if table_number is not None:
        t = get_table_by_number(db, table_number)
        if t:
            resolved_section = t.section
            if t.min_spend_per_pax > min_spend_per_pax:
                min_spend_per_pax = t.min_spend_per_pax
                applied_rule_name = f"Table {t.table_number} ({t.section})"

    weekday_short = target_date.strftime("%a")
    rules = get_rate_rules(db, active_only=True)
    for r in rules:
        days = [d.strip() for d in r.day_of_week.split(",") if d.strip()]
        day_matches = "All" in days or weekday_short in days
        section_matches = r.section == "All" or (resolved_section and r.section.lower() == resolved_section.lower())
        time_matches = target_time >= r.start_time

        if day_matches and section_matches and time_matches:
            if r.min_spend_per_pax >= min_spend_per_pax:
                min_spend_per_pax = r.min_spend_per_pax
                applied_rule_name = r.name
            if pax >= r.min_party_size_for_deposit and r.deposit_per_pax > deposit_per_pax:
                deposit_per_pax = r.deposit_per_pax
                applied_rule_name = applied_rule_name or r.name

    if customer_no_shows >= 2 and deposit_per_pax == 0:
        deposit_per_pax = 200.0
        applied_rule_name = "High No-Show Risk Deposit Policy"
    elif pax >= 6 and deposit_per_pax == 0:
        deposit_per_pax = 150.0
        applied_rule_name = applied_rule_name or "Large Party Deposit (6+ pax)"

    min_spend_required = round(min_spend_per_pax * pax, 2)
    deposit_amount = round(deposit_per_pax * pax, 2)
    return {
        "min_spend_required": min_spend_required,
        "deposit_amount": deposit_amount,
        "deposit_required": deposit_amount > 0,
        "applied_rule": applied_rule_name,
    }


# ---------- Reservation CRUD ----------

def get_reservations(
    db: Session,
    target_date: Optional[date] = None,
    status: Optional[ReservationStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Reservation]:
    stmt = select(Reservation).options(
        selectinload(Reservation.customer),
        selectinload(Reservation.server),
        selectinload(Reservation.transactions),
    )
    if target_date:
        stmt = stmt.where(Reservation.date == target_date)
    if status:
        stmt = stmt.where(Reservation.status == status)
    stmt = stmt.order_by(Reservation.date.asc(), Reservation.time.asc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_reservation(db: Session, reservation_id: uuid.UUID) -> Optional[Reservation]:
    stmt = (
        select(Reservation)
        .options(
            selectinload(Reservation.customer),
            selectinload(Reservation.server),
            selectinload(Reservation.transactions),
        )
        .where(Reservation.id == reservation_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def _apply_status_transition(customer: Customer, old_status: ReservationStatus, new_status: ReservationStatus) -> None:
    visited_states = (ReservationStatus.seated, ReservationStatus.completed)
    was_visited = old_status in visited_states
    is_visited = new_status in visited_states

    if not was_visited and is_visited:
        customer.total_visits += 1
    elif was_visited and not is_visited:
        customer.total_visits = max(0, customer.total_visits - 1)

    if old_status != ReservationStatus.no_show and new_status == ReservationStatus.no_show:
        customer.no_show_count += 1
    elif old_status == ReservationStatus.no_show and new_status != ReservationStatus.no_show:
        customer.no_show_count = max(0, customer.no_show_count - 1)

    sync_customer_loyalty(customer)


def create_reservation(db: Session, data: ReservationCreate) -> Reservation:
    phone = data.phone_number.strip()
    customer = get_customer_by_phone(db, phone)
    clean_name = data.name.strip() if data.name else "Unknown"

    if not customer:
        customer = Customer(
            phone_number=phone,
            name=clean_name or "Unknown",
            preferred_pax=data.pax,
        )
        db.add(customer)
        db.flush()
    else:
        if customer.name == "Unknown" and clean_name and clean_name != "Unknown":
            customer.name = clean_name
        if customer.preferred_pax is None:
            customer.preferred_pax = data.pax

    quote = calculate_rate_quote(
        db,
        target_date=data.date,
        target_time=data.time,
        pax=data.pax,
        table_number=data.table_number,
        customer_no_shows=customer.no_show_count,
    )
    deposit_status = data.deposit_status
    if deposit_status is None:
        deposit_status = DepositStatus.required if quote["deposit_required"] else DepositStatus.none

    server_id = data.server_id
    if server_id is None and data.table_number is not None:
        table_obj = get_table_by_number(db, data.table_number)
        if table_obj:
            section_server = db.execute(
                select(Staff).where(
                    Staff.is_active.is_(True),
                    Staff.assigned_section == table_obj.section,
                )
            ).scalars().first()
            if section_server:
                server_id = section_server.id

    reservation = Reservation(
        customer_id=customer.id,
        server_id=server_id,
        date=data.date,
        time=data.time,
        duration_minutes=data.duration_minutes,
        pax=data.pax,
        status=ReservationStatus.expected,
        table_number=data.table_number,
        notes=data.notes,
        occasion=data.occasion,
        source=data.source,
        external_booking_ref=data.external_booking_ref,
        min_spend_required=quote["min_spend_required"],
        deposit_amount=quote["deposit_amount"],
        deposit_status=deposit_status,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def update_reservation(db: Session, reservation: Reservation, data: ReservationUpdate) -> Reservation:
    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data.pop("status")
        old_status = reservation.status
        if new_status != old_status:
            _apply_status_transition(reservation.customer, old_status, new_status)
            reservation.status = new_status

    for field in (
        "date",
        "time",
        "duration_minutes",
        "pax",
        "table_number",
        "server_id",
        "notes",
        "occasion",
        "source",
        "deposit_status",
        "guest_rating",
        "guest_feedback",
    ):
        if field in update_data:
            setattr(reservation, field, update_data[field])

    db.commit()
    db.refresh(reservation)
    return reservation


def delete_reservation(db: Session, reservation: Reservation) -> None:
    db.delete(reservation)
    db.commit()


# ---------- Transaction & POS Order CRUD ----------

def create_transaction(db: Session, reservation: Reservation, data: TransactionCreate) -> Transaction:
    tx = Transaction(
        reservation_id=reservation.id,
        amount=data.amount,
        tip_amount=data.tip_amount,
        payment_method=data.payment_method,
        pos_receipt_id=data.pos_receipt_id,
        items_json=data.items_json,
    )
    db.add(tx)

    # Deduct menu item stock if itemized order provided
    if data.items_json:
        for item in data.items_json:
            menu_id = item.get("menu_item_id")
            qty = int(item.get("quantity", 1))
            if menu_id:
                try:
                    mid = uuid.UUID(str(menu_id))
                    menu_item = db.execute(select(MenuItem).where(MenuItem.id == mid)).scalar_one_or_none()
                    if menu_item:
                        menu_item.stock_quantity = max(0, menu_item.stock_quantity - qty)
                        if menu_item.stock_quantity == 0:
                            menu_item.is_available = False
                except ValueError:
                    pass

    customer = reservation.customer
    customer.lifetime_spend = round((customer.lifetime_spend or 0.0) + data.amount, 2)

    if data.mark_completed and reservation.status != ReservationStatus.completed:
        _apply_status_transition(customer, reservation.status, ReservationStatus.completed)
        reservation.status = ReservationStatus.completed
    else:
        sync_customer_loyalty(customer)

    db.commit()
    db.refresh(tx)
    return tx


def get_reservation_transactions(db: Session, reservation_id: uuid.UUID) -> list[Transaction]:
    stmt = (
        select(Transaction)
        .where(Transaction.reservation_id == reservation_id)
        .order_by(Transaction.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


# ---------- Table CRUD & Availability ----------

def get_tables(db: Session, active_only: bool = False) -> list[RestaurantTable]:
    stmt = select(RestaurantTable)
    if active_only:
        stmt = stmt.where(RestaurantTable.is_active.is_(True))
    stmt = stmt.order_by(RestaurantTable.table_number.asc())
    return list(db.execute(stmt).scalars().all())


def get_table(db: Session, table_id: uuid.UUID) -> Optional[RestaurantTable]:
    stmt = select(RestaurantTable).where(RestaurantTable.id == table_id)
    return db.execute(stmt).scalar_one_or_none()


def get_table_by_number(db: Session, table_number: int) -> Optional[RestaurantTable]:
    stmt = select(RestaurantTable).where(RestaurantTable.table_number == table_number)
    return db.execute(stmt).scalar_one_or_none()


def create_table(db: Session, data: TableCreate) -> RestaurantTable:
    table = RestaurantTable(**data.model_dump())
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


def update_table(db: Session, table: RestaurantTable, data: TableUpdate) -> RestaurantTable:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(table, key, value)
    db.commit()
    db.refresh(table)
    return table


def delete_table(db: Session, table: RestaurantTable) -> None:
    db.delete(table)
    db.commit()


def _times_overlap(t1: time, t2: time, window_minutes: int = 90) -> bool:
    dt1 = datetime.combine(date(2000, 1, 1), t1)
    dt2 = datetime.combine(date(2000, 1, 1), t2)
    return abs((dt1 - dt2).total_seconds()) < window_minutes * 60


def find_table_conflict(
    db: Session,
    table_number: int,
    target_date: date,
    target_time: time,
    exclude_reservation_id: Optional[uuid.UUID] = None,
    window_minutes: int = 90,
) -> Optional[Reservation]:
    stmt = (
        select(Reservation)
        .options(
            selectinload(Reservation.customer),
            selectinload(Reservation.server),
            selectinload(Reservation.transactions),
        )
        .where(
            Reservation.date == target_date,
            Reservation.table_number == table_number,
            Reservation.status.in_([
                ReservationStatus.pending,
                ReservationStatus.expected,
                ReservationStatus.seated,
            ]),
        )
    )
    if exclude_reservation_id:
        stmt = stmt.where(Reservation.id != exclude_reservation_id)

    candidates = list(db.execute(stmt).scalars().all())
    for r in candidates:
        if _times_overlap(r.time, target_time, window_minutes=window_minutes):
            return r
    return None


def get_tables_availability(
    db: Session,
    target_date: date,
    target_time: Optional[time] = None,
    pax: Optional[int] = None,
    exclude_reservation_id: Optional[uuid.UUID] = None,
) -> list[dict]:
    tables = get_tables(db, active_only=False)
    result = []
    for t in tables:
        conflict = None
        is_available = t.is_active
        if pax is not None and t.capacity < pax:
            is_available = False
        if target_time is not None and t.is_active:
            conflict = find_table_conflict(
                db,
                table_number=t.table_number,
                target_date=target_date,
                target_time=target_time,
                exclude_reservation_id=exclude_reservation_id,
            )
            if conflict is not None:
                is_available = False

        result.append({
            "id": t.id,
            "table_number": t.table_number,
            "capacity": t.capacity,
            "section": t.section,
            "min_spend_per_pax": t.min_spend_per_pax,
            "x_pos": t.x_pos,
            "y_pos": t.y_pos,
            "width": t.width,
            "height": t.height,
            "shape": t.shape,
            "rotation": t.rotation,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "is_available": is_available,
            "conflicting_reservation": conflict,
        })
    return result


# ---------- Staff / Employee Management CRUD ----------

def get_staff_list(db: Session, active_only: bool = False) -> list[Staff]:
    stmt = select(Staff)
    if active_only:
        stmt = stmt.where(Staff.is_active.is_(True))
    stmt = stmt.order_by(Staff.role.asc(), Staff.name.asc())
    return list(db.execute(stmt).scalars().all())


def get_staff_member(db: Session, staff_id: uuid.UUID) -> Optional[Staff]:
    return db.execute(select(Staff).where(Staff.id == staff_id)).scalar_one_or_none()


def create_staff_member(db: Session, data: StaffCreate) -> Staff:
    member = Staff(**data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_staff_member(db: Session, member: Staff, data: StaffUpdate) -> Staff:
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


def delete_staff_member(db: Session, member: Staff) -> None:
    db.delete(member)
    db.commit()


def get_staff_performance(db: Session) -> list[dict]:
    staff_members = get_staff_list(db)
    reservations = list(
        db.execute(
            select(Reservation).options(selectinload(Reservation.transactions))
        ).scalars().all()
    )
    result = []
    for s in staff_members:
        assigned_res = [r for r in reservations if r.server_id == s.id]
        covers = sum(r.pax for r in assigned_res if r.status in (ReservationStatus.seated, ReservationStatus.completed))
        revenue = sum(tx.amount for r in assigned_res for tx in r.transactions)
        tips = sum(tx.tip_amount for r in assigned_res for tx in r.transactions)
        ratings = [r.guest_rating for r in assigned_res if r.guest_rating is not None]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
        result.append({
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "phone_number": s.phone_number,
            "assigned_section": s.assigned_section,
            "shift": s.shift,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "reservations_handled": len(assigned_res),
            "covers_served": covers,
            "revenue_generated": round(revenue, 2),
            "tips_earned": round(tips, 2),
            "avg_rating": avg_rating,
        })
    result.sort(key=lambda x: x["revenue_generated"], reverse=True)
    return result


# ---------- Menu / POS Items CRUD ----------

def get_menu_items(db: Session, available_only: bool = False) -> list[MenuItem]:
    stmt = select(MenuItem)
    if available_only:
        stmt = stmt.where(MenuItem.is_available.is_(True))
    stmt = stmt.order_by(MenuItem.category.asc(), MenuItem.name.asc())
    return list(db.execute(stmt).scalars().all())


def create_menu_item(db: Session, data: MenuItemCreate) -> MenuItem:
    item = MenuItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(db: Session, item_id: uuid.UUID, data: MenuItemUpdate) -> Optional[MenuItem]:
    item = db.execute(select(MenuItem).where(MenuItem.id == item_id)).scalar_one_or_none()
    if not item:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


def delete_menu_item(db: Session, item_id: uuid.UUID) -> bool:
    item = db.execute(select(MenuItem).where(MenuItem.id == item_id)).scalar_one_or_none()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


# ---------- Built-In Accounting & Expenses CRUD ----------

def create_expense(db: Session, data: ExpenseCreate) -> Expense:
    exp = Expense(**data.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


def get_expenses(db: Session, target_date: Optional[date] = None) -> list[Expense]:
    stmt = select(Expense)
    if target_date:
        stmt = stmt.where(Expense.date == target_date)
    stmt = stmt.order_by(Expense.date.desc(), Expense.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def delete_expense(db: Session, expense_id: uuid.UUID) -> bool:
    exp = db.execute(select(Expense).where(Expense.id == expense_id)).scalar_one_or_none()
    if not exp:
        return False
    db.delete(exp)
    db.commit()
    return True


def get_accounting_summary(db: Session, target_date: Optional[date] = None) -> dict:
    tx_stmt = select(Transaction).join(Reservation)
    if target_date:
        tx_stmt = tx_stmt.where(Reservation.date == target_date)
    transactions = list(db.execute(tx_stmt).scalars().all())

    expenses = get_expenses(db, target_date=target_date)

    gross_revenue = round(sum(t.amount for t in transactions), 2)
    total_tips = round(sum(t.tip_amount for t in transactions), 2)
    total_expenses = round(sum(e.amount for e in expenses), 2)
    net_profit = round(gross_revenue - total_expenses, 2)

    by_payment_method: dict[str, float] = {}
    for t in transactions:
        method = t.payment_method.value if hasattr(t.payment_method, "value") else str(t.payment_method)
        by_payment_method[method] = round(by_payment_method.get(method, 0.0) + t.amount, 2)

    expenses_by_category: dict[str, float] = {}
    for e in expenses:
        expenses_by_category[e.category] = round(expenses_by_category.get(e.category, 0.0) + e.amount, 2)

    return {
        "gross_revenue": gross_revenue,
        "total_tips": total_tips,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "by_payment_method": by_payment_method,
        "expenses_by_category": expenses_by_category,
        "transactions_count": len(transactions),
        "recent_expenses": expenses[:25],
    }


# ---------- Marketing Automation & Guest Experience ----------

def get_segment_customers(db: Session, segment: str) -> list[Customer]:
    customers = list(db.execute(select(Customer)).scalars().all())
    seg = segment.lower()
    if seg == "vip":
        return [c for c in customers if c.loyalty_tier == LoyaltyTier.vip]
    if seg == "gold_vip":
        return [c for c in customers if c.loyalty_tier in (LoyaltyTier.gold, LoyaltyTier.vip)]
    if seg == "high_spenders":
        return [c for c in customers if c.lifetime_spend >= 15000]
    if seg == "regulars":
        return [c for c in customers if c.total_visits >= 5]
    if seg == "at_risk_no_show":
        return [c for c in customers if c.no_show_count >= 2]
    if seg == "celebrations":
        return [c for c in customers if c.birthday is not None or c.anniversary is not None]
    return customers


def get_campaigns(db: Session) -> list[Campaign]:
    stmt = select(Campaign).order_by(Campaign.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def create_campaign(db: Session, data: CampaignCreate) -> Campaign:
    recipients = get_segment_customers(db, data.target_segment)
    campaign = Campaign(
        name=data.name,
        channel=data.channel,
        target_segment=data.target_segment,
        message_template=data.message_template,
        recipients_count=len(recipients),
        status="sent",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


# ---------- Inventory & Maintenance CRUD ----------

def get_inventory_items(db: Session) -> list[InventoryItem]:
    stmt = select(InventoryItem).order_by(InventoryItem.category.asc(), InventoryItem.name.asc())
    return list(db.execute(stmt).scalars().all())


def create_inventory_item(db: Session, data: InventoryItemCreate) -> InventoryItem:
    item = InventoryItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_inventory_item(db: Session, item_id: uuid.UUID, data: InventoryItemUpdate) -> Optional[InventoryItem]:
    item = db.execute(select(InventoryItem).where(InventoryItem.id == item_id)).scalar_one_or_none()
    if not item:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


def delete_inventory_item(db: Session, item_id: uuid.UUID) -> bool:
    item = db.execute(select(InventoryItem).where(InventoryItem.id == item_id)).scalar_one_or_none()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def get_maintenance_tickets(db: Session) -> list[MaintenanceTicket]:
    stmt = select(MaintenanceTicket).order_by(MaintenanceTicket.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def create_maintenance_ticket(db: Session, data: MaintenanceTicketCreate) -> MaintenanceTicket:
    ticket = MaintenanceTicket(**data.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_maintenance_ticket(
    db: Session, ticket_id: uuid.UUID, data: MaintenanceTicketUpdate
) -> Optional[MaintenanceTicket]:
    ticket = db.execute(select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id)).scalar_one_or_none()
    if not ticket:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(ticket, k, v)
    if update_data.get("status") == MaintenanceStatus.resolved and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now()
    db.commit()
    db.refresh(ticket)
    return ticket


def delete_maintenance_ticket(db: Session, ticket_id: uuid.UUID) -> bool:
    ticket = db.execute(select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id)).scalar_one_or_none()
    if not ticket:
        return False
    db.delete(ticket)
    db.commit()
    return True


# ---------- Online Booking & Public Availability ----------

STANDARD_SLOTS = [
    time(13, 0),
    time(14, 0),
    time(15, 0),
    time(18, 0),
    time(19, 0),
    time(20, 0),
    time(21, 0),
    time(22, 0),
]


def get_public_slots_availability(
    db: Session, target_date: date, pax: int, section_preference: Optional[str] = None
) -> list[dict]:
    slots_out = []
    for slot_time in STANDARD_SLOTS:
        avail_tables = get_tables_availability(db, target_date=target_date, target_time=slot_time, pax=pax)
        matching = [
            t
            for t in avail_tables
            if t["is_available"]
            and (
                not section_preference
                or section_preference == "Any"
                or t["section"].lower() == section_preference.lower()
            )
        ]
        max_cap = max((t["capacity"] for t in matching), default=0)
        quote = calculate_rate_quote(
            db,
            target_date=target_date,
            target_time=slot_time,
            pax=pax,
            section=section_preference if section_preference != "Any" else None,
        )
        slots_out.append({
            "time": slot_time.strftime("%H:%M"),
            "available_tables": len(matching),
            "max_party_size": max_cap,
            "min_spend_per_pax": round(quote["min_spend_required"] / max(1, pax), 2),
        })
    return slots_out


def create_public_booking(db: Session, data: PublicBookingCreate) -> Reservation:
    avail_tables = get_tables_availability(db, target_date=data.date, target_time=data.time, pax=data.pax)
    candidates = [t for t in avail_tables if t["is_available"]]
    if data.section_preference and data.section_preference != "Any":
        sec_candidates = [
            t for t in candidates if t["section"].lower() == data.section_preference.lower()
        ]
        if sec_candidates:
            candidates = sec_candidates

    candidates.sort(key=lambda t: t["capacity"])
    chosen_table = candidates[0]["table_number"] if candidates else None

    res = create_reservation(
        db,
        ReservationCreate(
            phone_number=data.phone_number,
            name=data.name,
            date=data.date,
            time=data.time,
            pax=data.pax,
            table_number=chosen_table,
            notes=data.notes,
            occasion=data.occasion,
            source=data.source,
            external_booking_ref=data.external_booking_ref,
        ),
    )

    if data.email or data.dietary_notes:
        customer = res.customer
        if data.email:
            customer.email = data.email
        if data.dietary_notes:
            customer.dietary_notes = data.dietary_notes
        db.commit()
        db.refresh(res)

    return res


# ---------- Dashboard & Analytics ----------

def get_dashboard_stats(db: Session, target_date: date) -> dict:
    stmt = (
        select(Reservation)
        .options(selectinload(Reservation.customer), selectinload(Reservation.transactions))
        .where(Reservation.date == target_date)
    )
    reservations = list(db.execute(stmt).scalars().all())

    total = len(reservations)
    expected = sum(1 for r in reservations if r.status == ReservationStatus.expected)
    seated = sum(1 for r in reservations if r.status == ReservationStatus.seated)
    completed = sum(1 for r in reservations if r.status == ReservationStatus.completed)
    no_shows = sum(1 for r in reservations if r.status == ReservationStatus.no_show)
    total_pax = sum(r.pax for r in reservations)
    daily_revenue = sum(tx.amount for r in reservations for tx in r.transactions)
    vip_arrivals = sum(
        1
        for r in reservations
        if r.customer and r.customer.loyalty_tier in (LoyaltyTier.vip, LoyaltyTier.gold)
    )

    inventory_items = get_inventory_items(db)
    low_stock_alerts = sum(1 for i in inventory_items if i.current_stock <= i.par_level)

    open_tickets = sum(
        1
        for t in get_maintenance_tickets(db)
        if t.status in (MaintenanceStatus.open, MaintenanceStatus.in_progress)
    )

    return {
        "total_reservations": total,
        "expected": expected,
        "seated": seated,
        "completed": completed,
        "no_shows": no_shows,
        "total_pax": total_pax,
        "daily_revenue": round(daily_revenue, 2),
        "vip_arrivals": vip_arrivals,
        "low_stock_alerts": low_stock_alerts,
        "open_maintenance_tickets": open_tickets,
    }


def get_timeline(db: Session, target_date: date) -> dict[str, list[Reservation]]:
    stmt = (
        select(Reservation)
        .options(
            selectinload(Reservation.customer),
            selectinload(Reservation.server),
            selectinload(Reservation.transactions),
        )
        .where(Reservation.date == target_date)
        .order_by(Reservation.time.asc())
    )
    reservations = list(db.execute(stmt).scalars().all())

    timeline: dict[str, list[Reservation]] = {}
    for r in reservations:
        slot = r.time.strftime("%H:%M")
        timeline.setdefault(slot, []).append(r)
    return timeline


def get_analytics_report(db: Session) -> dict:
    reservations = list(
        db.execute(
            select(Reservation).options(
                selectinload(Reservation.customer),
                selectinload(Reservation.transactions),
            )
        ).scalars().all()
    )
    tables_by_num = {t.table_number: t for t in get_tables(db)}

    total_reservations = len(reservations)
    total_covers = sum(r.pax for r in reservations)
    total_revenue = round(sum(tx.amount for r in reservations for tx in r.transactions), 2)
    avg_spend_per_cover = round(total_revenue / total_covers, 2) if total_covers > 0 else 0.0

    completed_count = sum(1 for r in reservations if r.status == ReservationStatus.completed)
    no_show_count = sum(1 for r in reservations if r.status == ReservationStatus.no_show)
    completion_rate = round((completed_count / total_reservations) * 100, 1) if total_reservations > 0 else 0.0
    no_show_rate = round((no_show_count / total_reservations) * 100, 1) if total_reservations > 0 else 0.0

    ratings = [r.guest_rating for r in reservations if r.guest_rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    revenue_by_section: dict[str, float] = {}
    for r in reservations:
        sec = "Unassigned"
        if r.table_number and r.table_number in tables_by_num:
            sec = tables_by_num[r.table_number].section
        rev = sum(tx.amount for tx in r.transactions)
        revenue_by_section[sec] = round(revenue_by_section.get(sec, 0.0) + rev, 2)

    bookings_by_source: dict[str, int] = {}
    for r in reservations:
        src = r.source.value if hasattr(r.source, "value") else str(r.source)
        bookings_by_source[src] = bookings_by_source.get(src, 0) + 1

    hour_counts: dict[str, dict] = {}
    for r in reservations:
        hr = f"{r.time.strftime('%H')}:00"
        entry = hour_counts.setdefault(hr, {"hour": hr, "reservations": 0, "covers": 0})
        entry["reservations"] += 1
        entry["covers"] += r.pax
    peak_hours = sorted(hour_counts.values(), key=lambda x: x["hour"])

    top_customers = list(
        db.execute(select(Customer).order_by(Customer.lifetime_spend.desc()).limit(5)).scalars().all()
    )
    staff_leaderboard = get_staff_performance(db)

    return {
        "total_revenue": total_revenue,
        "total_reservations": total_reservations,
        "total_covers": total_covers,
        "avg_spend_per_cover": avg_spend_per_cover,
        "completion_rate": completion_rate,
        "no_show_rate": no_show_rate,
        "avg_guest_rating": avg_rating,
        "revenue_by_section": revenue_by_section,
        "bookings_by_source": bookings_by_source,
        "peak_hours": peak_hours,
        "top_customers": top_customers,
        "staff_leaderboard": staff_leaderboard,
    }
