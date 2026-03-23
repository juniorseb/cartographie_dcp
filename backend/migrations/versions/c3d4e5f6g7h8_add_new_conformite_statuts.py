"""Add new conformite statuts (partiellement_conforme, non_conforme)

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-23
"""
from alembic import op

revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter les nouvelles valeurs à l'enum PostgreSQL
    op.execute("ALTER TYPE statut_conformite_enum ADD VALUE IF NOT EXISTS 'Partiellement conforme'")
    op.execute("ALTER TYPE statut_conformite_enum ADD VALUE IF NOT EXISTS 'Non conforme'")


def downgrade():
    # PostgreSQL ne supporte pas facilement le retrait de valeurs d'enum
    # On laisse les valeurs en place pour éviter la perte de données
    pass
