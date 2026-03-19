"""add decret_creation to entites_base

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-18 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('entites_base', sa.Column('decret_creation', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('entites_base', 'decret_creation')
