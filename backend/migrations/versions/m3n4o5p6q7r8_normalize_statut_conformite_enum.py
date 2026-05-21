"""normalize statut_conformite_enum (passage SQLAlchemy values_callable)

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-05-13 17:00:00.000000

Probleme corrige : la BDD avait un MELANGE de valeurs d'enum
('conforme', 'demarche_achevee', 'demarche_en_cours' = .name) et
('Conforme', 'Partiellement conforme', 'Non conforme' = .value)
selon les migrations passees. SQLAlchemy par defaut ecrit le .name,
ce qui produisait des erreurs sur les nouvelles valeurs.

Cette migration :
1. Ajoute les .value manquants a l'enum PostgreSQL (Conforme, Demarche achevee, Demarche en cours)
2. Normalise les rows existantes vers les .value
3. Le model passe a values_callable (cf. entites_conformite.py)
"""
from alembic import op
import sqlalchemy as sa

revision = 'm3n4o5p6q7r8'
down_revision = 'l2m3n4o5p6q7'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Ajout des valeurs manquantes a l'enum PostgreSQL.
    # ALTER TYPE ADD VALUE doit s'executer en autocommit (hors transaction
    # alembic), sinon PostgreSQL ne peut pas committer la nouvelle valeur
    # avant qu'elle soit utilisable.
    with op.get_context().autocommit_block():
        for new_value in ['Conforme', 'Démarche achevée', 'Démarche en cours']:
            op.execute(
                f"ALTER TYPE statut_conformite_enum ADD VALUE IF NOT EXISTS '{new_value}'"
            )

    # 2. Normalisation des rows existantes : toutes les anciennes valeurs en
    # snake_case sont migrees vers leur equivalent .value (dans la transaction).
    op.execute(
        "UPDATE entites_conformite SET statut_conformite = 'Conforme' "
        "WHERE statut_conformite = 'conforme'"
    )
    op.execute(
        "UPDATE entites_conformite SET statut_conformite = 'Démarche achevée' "
        "WHERE statut_conformite = 'demarche_achevee'"
    )
    op.execute(
        "UPDATE entites_conformite SET statut_conformite = 'Démarche en cours' "
        "WHERE statut_conformite = 'demarche_en_cours'"
    )

    # Note : les anciennes valeurs (conforme/demarche_achevee/demarche_en_cours)
    # restent orphelines dans le type PostgreSQL. Le drop d'une valeur d'enum
    # PostgreSQL n'est pas supporte directement et n'apporterait rien
    # fonctionnellement.


def downgrade():
    # On ne reverse pas (impossible de supprimer des valeurs d'enum sans
    # recreer le type, ce qui necessite un downtime).
    pass
