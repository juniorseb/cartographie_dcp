"""add traitements_dossier and signalements_erreur tables

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-05-13 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = 'j0k1l2m3n4o5'
down_revision = 'i9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade():
    # Workflow Traiter (cree dynamiquement par db.create_all() lors du dev,
    # mais ajoute ici pour les environnements gestion par migrations)
    if not _table_exists('traitements_dossier'):
        op.create_table(
            'traitements_dossier',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), nullable=False, index=True),
            sa.Column('traitant_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('commentaires_par_rubrique', JSONB, nullable=False, server_default='{}'),
            sa.Column('score_automatique', sa.Integer()),
            sa.Column('score_manuel', sa.Integer()),
            sa.Column('niveau_conformite', sa.String(50)),
            sa.Column('recommandations', sa.Text()),
            sa.Column('statut', sa.String(50), nullable=False, server_default='en_cours'),
            sa.Column('valide_par', sa.String(36), sa.ForeignKey('users.id')),
            sa.Column('valide_le', sa.DateTime(timezone=True)),
            sa.Column('decision_validation', sa.String(20)),
            sa.Column('motif_retour', sa.Text()),
            sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # Signalements d'erreur entreprise -> Super Admin
    op.create_table(
        'signalements_erreur',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), nullable=False, index=True),
        sa.Column('compte_id', sa.String(36), sa.ForeignKey('comptes_entreprises.id'), nullable=False, index=True),
        sa.Column('sujet', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('rubrique_concernee', sa.String(120)),
        sa.Column('statut', sa.String(20), nullable=False, server_default='open', index=True),
        sa.Column('traite_par', sa.String(36), sa.ForeignKey('users.id'), index=True),
        sa.Column('reponse_admin', sa.Text()),
        sa.Column('date_traitement', sa.DateTime(timezone=True)),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # CompteEntreprise : ajouts documents inscription + verification email RL
    with op.batch_alter_table('comptes_entreprises') as batch:
        batch.add_column(sa.Column(
            'documents_inscription', JSONB, nullable=False, server_default='[]'
        ))
        batch.add_column(sa.Column('rl_email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch.add_column(sa.Column('rl_email_token', sa.String(64)))
        batch.add_column(sa.Column('rl_email_token_expires_at', sa.DateTime(timezone=True)))
        batch.create_index('ix_comptes_entreprises_rl_email_token', ['rl_email_token'])


def downgrade():
    with op.batch_alter_table('comptes_entreprises') as batch:
        batch.drop_index('ix_comptes_entreprises_rl_email_token')
        batch.drop_column('rl_email_token_expires_at')
        batch.drop_column('rl_email_token')
        batch.drop_column('rl_email_verified')
        batch.drop_column('documents_inscription')
    op.drop_table('signalements_erreur')
    if _table_exists('traitements_dossier'):
        op.drop_table('traitements_dossier')


def _table_exists(name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return name in insp.get_table_names()
