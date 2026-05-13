"""add password_must_change to comptes_entreprises

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-05-07 16:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'comptes_entreprises',
        sa.Column('password_must_change', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column('comptes_entreprises', 'password_must_change')
