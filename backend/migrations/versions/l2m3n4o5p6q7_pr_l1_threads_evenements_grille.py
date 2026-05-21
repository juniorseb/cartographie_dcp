"""L1 PR fondations : threads commentaires + dossier_evenements + grille_scoring + version formulaire

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-05-13 16:00:00.000000

Apporte :
- commentaires_dossier : parent_id (threads de reponse), auteur_role, edited_at
- dossier_evenements : audit trail global (chaque action sensible loggee)
- grille_scoring + grille_critere : schema pour grille externalisee versionnee
- entites_conformite.grille_version_id : trace de la grille utilisee pour le score
- formulaires_dcp.version : verrouillage optimiste sur les ecritures concurrentes
- entites_base.archive + date_archivage : soft delete

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade():
    # --- Extension commentaires_dossier : threads + role auteur + edition ---
    with op.batch_alter_table('commentaires_dossier') as batch:
        batch.add_column(sa.Column(
            'parent_id', sa.String(36),
            sa.ForeignKey('commentaires_dossier.id'), nullable=True,
        ))
        batch.add_column(sa.Column('auteur_role', sa.String(20), nullable=True))
        batch.add_column(sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True))
        batch.create_index('ix_commentaires_parent', ['parent_id'])

    # --- Nouvelle table grille_scoring (versionning de la grille officielle ARTCI) ---
    op.create_table(
        'grille_scoring',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('version', sa.String(40), nullable=False),
        sa.Column('libelle', sa.String(200), nullable=False),
        sa.Column('actif', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('document_url', sa.String(500)),
        sa.Column('cree_par', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('version', name='uq_grille_version'),
    )

    # --- Criteres de la grille ---
    op.create_table(
        'grille_critere',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('grille_id', sa.String(36), sa.ForeignKey('grille_scoring.id'), nullable=False, index=True),
        sa.Column('cle', sa.String(80), nullable=False),  # ex: 'connaissance_loi'
        sa.Column('libelle', sa.String(200), nullable=False),
        sa.Column('poids_max', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('ordre', sa.Integer(), nullable=False, server_default='0'),
        sa.UniqueConstraint('grille_id', 'cle', name='uq_grille_critere_cle'),
    )

    # --- Reference grille utilisee pour calculer le score sur EntiteConformite ---
    with op.batch_alter_table('entites_conformite') as batch:
        batch.add_column(sa.Column(
            'grille_version_id', sa.String(36),
            sa.ForeignKey('grille_scoring.id'), nullable=True,
        ))

    # --- formulaires_dcp.version : verrouillage optimiste ---
    with op.batch_alter_table('formulaires_dcp') as batch:
        batch.add_column(sa.Column('version', sa.Integer(), nullable=False, server_default='1'))

    # --- entites_base : soft delete ---
    with op.batch_alter_table('entites_base') as batch:
        batch.add_column(sa.Column('archive', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch.add_column(sa.Column('date_archivage', sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column('motif_archivage', sa.Text(), nullable=True))

    # --- Audit trail global : dossier_evenements ---
    op.create_table(
        'dossier_evenements',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entite_id', sa.String(36), sa.ForeignKey('entites_base.id'), nullable=False, index=True),
        # type d'evenement : soumission, re_soumission, retour_entreprise,
        # validation_n_plus_1, publication, depublication, depublication_auto,
        # re_publication, assignation, re_assignation, commentaire_ajoute,
        # commentaire_resolu, commentaire_repondu, score_modifie, formalite_deposee
        sa.Column('evenement_type', sa.String(50), nullable=False, index=True),
        # Acteur : user OU compte_entreprise. On stocke les deux nullable.
        sa.Column('acteur_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('acteur_compte_id', sa.String(36), sa.ForeignKey('comptes_entreprises.id'), nullable=True, index=True),
        sa.Column('acteur_role', sa.String(20), nullable=True),  # super_admin/admin/editor/reader/entreprise/system
        sa.Column('payload', JSONB, nullable=False, server_default='{}'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )
    op.create_index(
        'ix_dossier_evenements_entite_type_date',
        'dossier_evenements', ['entite_id', 'evenement_type', 'createdAt'],
    )


def downgrade():
    op.drop_index('ix_dossier_evenements_entite_type_date', table_name='dossier_evenements')
    op.drop_table('dossier_evenements')

    with op.batch_alter_table('entites_base') as batch:
        batch.drop_column('motif_archivage')
        batch.drop_column('date_archivage')
        batch.drop_column('archive')

    with op.batch_alter_table('formulaires_dcp') as batch:
        batch.drop_column('version')

    with op.batch_alter_table('entites_conformite') as batch:
        batch.drop_column('grille_version_id')

    op.drop_table('grille_critere')
    op.drop_table('grille_scoring')

    with op.batch_alter_table('commentaires_dossier') as batch:
        batch.drop_index('ix_commentaires_parent')
        batch.drop_column('edited_at')
        batch.drop_column('auteur_role')
        batch.drop_column('parent_id')
