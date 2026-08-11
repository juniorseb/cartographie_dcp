"""add statut_juridique to comptes_entreprises (personne physique / morale)

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-08-10 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'r8s9t0u1v2w3'
down_revision = 'q7r8s9t0u1v2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'comptes_entreprises',
        sa.Column('statut_juridique', sa.String(20), nullable=False, server_default='pm_droit_prive'),
    )


def downgrade():
    op.drop_column('comptes_entreprises', 'statut_juridique')
