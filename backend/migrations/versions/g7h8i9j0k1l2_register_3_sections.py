"""add inscription DG/DPO/access fields and inscription_statut

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2026-05-07 15:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'g7h8i9j0k1l2'
down_revision = 'f6g7h8i9j0k1'
branch_labels = None
depends_on = None


def upgrade():
    # Statut validation inscription
    op.add_column('comptes_entreprises', sa.Column('inscription_statut', sa.String(20), nullable=False, server_default='pending'))
    op.add_column('comptes_entreprises', sa.Column('inscription_validee_par', sa.String(36), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('inscription_validee_le', sa.DateTime(timezone=True), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('inscription_motif_rejet', sa.Text(), nullable=True))

    # DG
    op.add_column('comptes_entreprises', sa.Column('dg_nom', sa.String(200), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dg_prenom', sa.String(200), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dg_fonction', sa.String(200), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dg_telephone', sa.String(30), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dg_email', sa.String(255), nullable=True))

    # DPO
    op.add_column('comptes_entreprises', sa.Column('dpo_nom', sa.String(200), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dpo_prenom', sa.String(200), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dpo_telephone', sa.String(30), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dpo_email', sa.String(255), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dpo_type', sa.String(20), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('dpo_organisme', sa.String(255), nullable=True))

    # Acces
    op.add_column('comptes_entreprises', sa.Column('acces_email_referant', sa.String(255), nullable=True))
    op.add_column('comptes_entreprises', sa.Column('acces_email_dpo', sa.String(255), nullable=True))


def downgrade():
    for col in ['acces_email_dpo', 'acces_email_referant',
                'dpo_organisme', 'dpo_type', 'dpo_email', 'dpo_telephone', 'dpo_prenom', 'dpo_nom',
                'dg_email', 'dg_telephone', 'dg_fonction', 'dg_prenom', 'dg_nom',
                'inscription_motif_rejet', 'inscription_validee_le', 'inscription_validee_par',
                'inscription_statut']:
        op.drop_column('comptes_entreprises', col)
