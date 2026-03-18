"""add autorisation to type_document_enum

Revision ID: a1b2c3d4e5f6
Revises: 483ae2f6da4a
Create Date: 2026-03-18 12:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '483ae2f6da4a'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'autorisation' value to type_document_enum
    # PostgreSQL syntax
    op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'autorisation'")


def downgrade():
    # PostgreSQL does not support removing enum values easily
    # This is a no-op for downgrade
    pass
