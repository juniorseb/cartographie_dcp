"""add scores_par_critere to traitements_dossier (K6 : score par critere du bareme officiel)

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1
Create Date: 2026-05-26 18:00:00.000000

Spec K6 : « Pour chaque question/critere du bareme, l'admin peut saisir une
note 0..max et un commentaire ». 7 criteres officiels du document de cadrage
ARTCI (cf. ScoringService). Total = 100 pts, parallele a scores_par_rubrique.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'q7r8s9t0u1v2'
down_revision = 'p6q7r8s9t0u1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'traitements_dossier',
        sa.Column('scores_par_critere', JSONB(astext_type=sa.Text()),
                  nullable=False, server_default='{}'),
    )


def downgrade():
    op.drop_column('traitements_dossier', 'scores_par_critere')
