"""add full hospitality suite models and columns

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-26 01:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bookingsource_enum = sa.Enum("phone", "walk_in", "online", "whatsapp", "ota", name="bookingsource")
    paymentmethod_enum = sa.Enum("cash", "card", "instapay", "wallet", name="paymentmethod")
    depositstatus_enum = sa.Enum("none", "required", "paid", "refunded", name="depositstatus")
    staffrole_enum = sa.Enum("manager", "host", "server", "chef", name="staffrole")
    maintpriority_enum = sa.Enum("low", "medium", "high", "critical", name="maintenancepriority")
    maintstatus_enum = sa.Enum("open", "in_progress", "resolved", name="maintenancestatus")

    op.create_table(
        "staff",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", staffrole_enum, nullable=False, server_default="server"),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("assigned_section", sa.String(100), nullable=True),
        sa.Column("shift", sa.String(100), nullable=False, server_default="Evening (17:00 - 01:00)"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "rate_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("section", sa.String(100), nullable=False, server_default="All"),
        sa.Column("day_of_week", sa.String(50), nullable=False, server_default="Thu,Fri,Sat"),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("min_spend_per_pax", sa.Float, nullable=False, server_default="0"),
        sa.Column("deposit_per_pax", sa.Float, nullable=False, server_default="0"),
        sa.Column("min_party_size_for_deposit", sa.Integer, nullable=False, server_default="4"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, server_default="Main Course"),
        sa.Column("price", sa.Float, nullable=False),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("stock_quantity", sa.Integer, nullable=False, server_default="50"),
        sa.Column("low_stock_threshold", sa.Integer, nullable=False, server_default="5"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("category", sa.String(100), nullable=False, server_default="Supplies"),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("amount", sa.Float, nullable=False),
        sa.Column("payment_method", paymentmethod_enum, nullable=False, server_default="cash"),
        sa.Column("recorded_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False, server_default="whatsapp"),
        sa.Column("target_segment", sa.String(100), nullable=False, server_default="all"),
        sa.Column("message_template", sa.Text, nullable=False),
        sa.Column("recipients_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="sent"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, server_default="Produce"),
        sa.Column("unit", sa.String(50), nullable=False, server_default="kg"),
        sa.Column("current_stock", sa.Float, nullable=False, server_default="0"),
        sa.Column("par_level", sa.Float, nullable=False, server_default="10"),
        sa.Column("cost_per_unit", sa.Float, nullable=False, server_default="0"),
        sa.Column("supplier", sa.String(255), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "maintenance_tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("equipment_name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(100), nullable=False, server_default="Kitchen"),
        sa.Column("issue_description", sa.Text, nullable=False),
        sa.Column("priority", maintpriority_enum, nullable=False, server_default="medium"),
        sa.Column("status", maintstatus_enum, nullable=False, server_default="open"),
        sa.Column("assigned_to", sa.String(255), nullable=True),
        sa.Column("estimated_cost", sa.Float, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Extend existing tables
    op.add_column("customers", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("customers", sa.Column("dietary_notes", sa.Text, nullable=True))
    op.add_column("customers", sa.Column("birthday", sa.Date, nullable=True))
    op.add_column("customers", sa.Column("anniversary", sa.Date, nullable=True))

    op.add_column("restaurant_tables", sa.Column("min_spend_per_pax", sa.Float, nullable=False, server_default="0"))
    op.add_column("restaurant_tables", sa.Column("x_pos", sa.Float, nullable=False, server_default="80"))
    op.add_column("restaurant_tables", sa.Column("y_pos", sa.Float, nullable=False, server_default="80"))
    op.add_column("restaurant_tables", sa.Column("width", sa.Float, nullable=False, server_default="90"))
    op.add_column("restaurant_tables", sa.Column("height", sa.Float, nullable=False, server_default="90"))
    op.add_column("restaurant_tables", sa.Column("shape", sa.String(30), nullable=False, server_default="round"))
    op.add_column("restaurant_tables", sa.Column("rotation", sa.Integer, nullable=False, server_default="0"))

    op.add_column(
        "reservations",
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("reservations", sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="90"))
    op.add_column("reservations", sa.Column("occasion", sa.String(100), nullable=True))
    op.add_column("reservations", sa.Column("source", bookingsource_enum, nullable=False, server_default="phone"))
    op.add_column("reservations", sa.Column("external_booking_ref", sa.String(100), nullable=True))
    op.add_column("reservations", sa.Column("min_spend_required", sa.Float, nullable=False, server_default="0"))
    op.add_column("reservations", sa.Column("deposit_amount", sa.Float, nullable=False, server_default="0"))
    op.add_column("reservations", sa.Column("deposit_status", depositstatus_enum, nullable=False, server_default="none"))
    op.add_column("reservations", sa.Column("guest_rating", sa.Integer, nullable=True))
    op.add_column("reservations", sa.Column("guest_feedback", sa.Text, nullable=True))

    op.add_column("transactions", sa.Column("tip_amount", sa.Float, nullable=False, server_default="0"))
    op.add_column("transactions", sa.Column("payment_method", paymentmethod_enum, nullable=False, server_default="card"))
    op.add_column("transactions", sa.Column("items_json", sa.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "items_json")
    op.drop_column("transactions", "payment_method")
    op.drop_column("transactions", "tip_amount")

    op.drop_column("reservations", "guest_feedback")
    op.drop_column("reservations", "guest_rating")
    op.drop_column("reservations", "deposit_status")
    op.drop_column("reservations", "deposit_amount")
    op.drop_column("reservations", "min_spend_required")
    op.drop_column("reservations", "external_booking_ref")
    op.drop_column("reservations", "source")
    op.drop_column("reservations", "occasion")
    op.drop_column("reservations", "server_id")

    op.drop_column("restaurant_tables", "min_spend_per_pax")

    op.drop_column("customers", "anniversary")
    op.drop_column("customers", "birthday")
    op.drop_column("customers", "dietary_notes")
    op.drop_column("customers", "email")

    op.drop_table("maintenance_tickets")
    op.drop_table("inventory_items")
    op.drop_table("campaigns")
    op.drop_table("expenses")
    op.drop_table("menu_items")
    op.drop_table("rate_rules")
    op.drop_table("staff")
