"""add formalites activation flags on entites_conformite

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-05-07 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'f6g7h8i9j0k1'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'entites_conformite',
        sa.Column('formalite_autorisation_active', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'entites_conformite',
        sa.Column('formalite_declaration_active', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column('entites_conformite', 'formalite_declaration_active')
    op.drop_column('entites_conformite', 'formalite_autorisation_active')
