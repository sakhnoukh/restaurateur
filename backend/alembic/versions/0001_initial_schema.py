"""initial schema

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    loyalty_tier_enum = sa.Enum("none", "silver", "gold", "vip", name="loyaltytier")
    reservation_status_enum = sa.Enum(
        "pending", "expected", "seated", "completed", "no_show", name="reservationstatus"
    )

    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone_number", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False, server_default="Unknown"),
        sa.Column("total_visits", sa.Integer, nullable=False, server_default="0"),
        sa.Column("lifetime_spend", sa.Float, nullable=False, server_default="0"),
        sa.Column("loyalty_tier", loyalty_tier_enum, nullable=False, server_default="none"),
        sa.Column("no_show_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("preferred_pax", sa.Integer, nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("time", sa.Time, nullable=False),
        sa.Column("pax", sa.Integer, nullable=False),
        sa.Column("status", reservation_status_enum, nullable=False, server_default="pending"),
        sa.Column("table_number", sa.Integer, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("pos_receipt_id", sa.String(255), nullable=True),
        sa.Column("amount", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("reservations")
    op.drop_table("customers")
    sa.Enum(name="reservationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="loyaltytier").drop(op.get_bind(), checkfirst=True)
