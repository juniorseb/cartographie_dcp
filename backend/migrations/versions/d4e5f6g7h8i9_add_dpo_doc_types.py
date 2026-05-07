"""add DPO document types and rapport_audit to type_document_enum

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op

revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade():
    # ALTER TYPE ADD VALUE doit etre hors transaction
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'rapport_audit'")
        op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'dpo_cv'")
        op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'dpo_casier_judiciaire'")
        op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'dpo_cni'")
        op.execute("ALTER TYPE type_document_enum ADD VALUE IF NOT EXISTS 'dpo_extrait_naissance'")


def downgrade():
    pass
