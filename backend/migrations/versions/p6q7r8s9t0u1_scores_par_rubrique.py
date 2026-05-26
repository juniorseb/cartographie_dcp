"""add scores_par_rubrique to traitements_dossier (K7 : score manuel par partie)

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-05-26 16:00:00.000000

Spec K7 : « Ajouter la saisie manuelle (score chaque partie, commentaire),
score finale manuel. » L'editeur saisit un score par rubrique (5 parties du
formulaire DCP). Le score manuel global devient la somme.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'p6q7r8s9t0u1'
down_revision = 'o5p6q7r8s9t0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'traitements_dossier',
        sa.Column('scores_par_rubrique', JSONB(astext_type=sa.Text()),
                  nullable=False, server_default='{}'),
    )


def downgrade():
    op.drop_column('traitements_dossier', 'scores_par_rubrique')
