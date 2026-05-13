"""add formulaires_dcp table (JSONB pour reponses du questionnaire officiel)

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-05-08 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = 'i9j0k1l2m3n4'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'formulaires_dcp',
        sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), primary_key=True),
        sa.Column('reponses', JSONB, nullable=False, server_default='{}'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('formulaires_dcp')
