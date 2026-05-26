"""remove 'conforme' from statut_workflow_enum

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-05-26 12:00:00.000000

Le statut workflow 'conforme' a ete supprime : la conformite est portee par
le statut de conformite (table conformite), pas par le workflow. Un dossier
dont le traitement est termine a 100/100 est simplement 'valide'.

Cette migration :
1. Migre les rows existantes : entite_workflows.statut = 'conforme' -> 'valide'.
2. Migre les rows d'historique : historique_statuts.{ancien,nouveau}_statut
   = 'conforme' -> 'valide'.

La valeur 'conforme' reste orpheline dans le type PostgreSQL statut_workflow_enum
(PostgreSQL ne supporte pas le drop d'une valeur d'enum sans recreer le type).
Le code Python ne la genere plus, donc c'est sans impact fonctionnel.
"""
from alembic import op


revision = 'n4o5p6q7r8s9'
down_revision = 'm3n4o5p6q7r8'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Workflow : dossiers actuellement 'conforme' -> 'valide'.
    op.execute(
        "UPDATE entites_workflow SET statut = 'valide' "
        "WHERE statut = 'conforme'"
    )

    # 2. Historique des statuts (champs TEXT, pas enum) : on aligne pour eviter
    # toute confusion lors de la lecture.
    op.execute(
        "UPDATE historique_statuts SET ancien_statut = 'valide' "
        "WHERE ancien_statut = 'conforme'"
    )
    op.execute(
        "UPDATE historique_statuts SET nouveau_statut = 'valide' "
        "WHERE nouveau_statut = 'conforme'"
    )


def downgrade():
    # On ne reverse pas : remettre 'conforme' apres le retrait du code Python
    # creerait des rows que l'application ne sait plus traiter.
    pass
