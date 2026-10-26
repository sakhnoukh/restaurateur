"""add restaurant_tables table

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-26 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "restaurant_tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("table_number", sa.Integer, unique=True, nullable=False, index=True),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("section", sa.String(100), nullable=False, server_default="Main Dining"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("restaurant_tables")
