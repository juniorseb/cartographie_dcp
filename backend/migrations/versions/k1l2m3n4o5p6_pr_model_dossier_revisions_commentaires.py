"""add dossier_revisions + commentaires_dossier (PR model)

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-05-13 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = 'k1l2m3n4o5p6'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'dossier_revisions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), nullable=False, index=True),
        sa.Column('numero_revision', sa.Integer(), nullable=False),
        sa.Column('reponses_snapshot', JSONB, nullable=False),
        sa.Column('statut_au_moment', sa.String(50)),
        sa.Column('score_automatique_snapshot', sa.Integer()),
        sa.Column('soumis_par_compte_id', sa.String(36), sa.ForeignKey('comptes_entreprises.id'), index=True),
        sa.Column('soumis_le', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('entite_id', 'numero_revision', name='uq_revision_entite_numero'),
    )
    op.create_index(
        'ix_dossier_revisions_entite_numero',
        'dossier_revisions', ['entite_id', 'numero_revision'],
    )

    op.create_table(
        'commentaires_dossier',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), nullable=False, index=True),
        sa.Column('revision_id', sa.String(36), sa.ForeignKey('dossier_revisions.id')),
        sa.Column('agent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('rubrique', sa.String(64), nullable=False),
        sa.Column('sous_question', sa.String(200)),
        sa.Column('contenu', sa.Text(), nullable=False),
        sa.Column('etat', sa.String(20), nullable=False, server_default='open', index=True),
        sa.Column('resolu_par', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('resolu_le', sa.DateTime(timezone=True)),
        sa.Column('reponse_entreprise', sa.Text()),
        sa.Column('repondu_le', sa.DateTime(timezone=True)),
        sa.Column('cree_le', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('maj_le', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        'ix_commentaires_entite_etat',
        'commentaires_dossier', ['entite_id', 'etat'],
    )
    op.create_index(
        'ix_commentaires_revision',
        'commentaires_dossier', ['revision_id'],
    )


def downgrade():
    op.drop_index('ix_commentaires_revision', table_name='commentaires_dossier')
    op.drop_index('ix_commentaires_entite_etat', table_name='commentaires_dossier')
    op.drop_table('commentaires_dossier')
    op.drop_index('ix_dossier_revisions_entite_numero', table_name='dossier_revisions')
    op.drop_table('dossier_revisions')
