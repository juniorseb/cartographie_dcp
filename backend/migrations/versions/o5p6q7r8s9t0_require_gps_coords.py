"""make latitude/longitude NOT NULL on entites_localisation

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-05-26 14:00:00.000000

Spec : les coordonnees GPS sont OBLIGATOIRES pour toute entite (donnee
d'identite, pas option d'affichage).

Cette migration :
1. Detecte les rows EntiteLocalisation avec lat OU lng NULL.
2. Si des rows incompletes existent, ABORT avec un message clair listant
   les entites concernees — l'admin doit les corriger via l'UI avant de
   relancer le deploy.
3. Si tout est propre, applique la contrainte NOT NULL.

Pourquoi cette logique defensive : appliquer NOT NULL avec des rows NULL
en base fait echouer le deploy en PostgreSQL ; et auto-backfiller avec
une valeur arbitraire (0,0 ou centre du pays) ferait apparaitre l'entite
au mauvais endroit sur la carte. Mieux vaut bloquer et avertir.
"""
from alembic import op
import sqlalchemy as sa


revision = 'o5p6q7r8s9t0'
down_revision = 'n4o5p6q7r8s9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # 1. Detection des rows incompletes
    incomplete = bind.execute(sa.text(
        "SELECT l.entite_id, e.denomination "
        "FROM entites_localisation l "
        "LEFT JOIN entites_base e ON e.id = l.entite_id "
        "WHERE l.latitude IS NULL OR l.longitude IS NULL"
    )).fetchall()

    # 2. Detection des EntiteBase sans aucune ligne de localisation
    missing = bind.execute(sa.text(
        "SELECT e.id, e.denomination "
        "FROM entites_base e "
        "LEFT JOIN entites_localisation l ON l.entite_id = e.id "
        "WHERE l.entite_id IS NULL AND e.archive = false"
    )).fetchall()

    if incomplete or missing:
        details = []
        if incomplete:
            details.append("Localisations sans GPS :")
            for entite_id, denom in incomplete:
                details.append(f"  - {denom or entite_id}")
        if missing:
            details.append("Entites sans ligne de localisation :")
            for entite_id, denom in missing:
                details.append(f"  - {denom or entite_id}")
        details.append(
            "\nCorrigez ces entites (renseigner latitude/longitude depuis "
            "l'interface admin) puis relancez la migration."
        )
        raise RuntimeError(
            "Migration GPS NOT NULL bloquee : des entites n'ont pas de "
            "coordonnees GPS.\n\n" + "\n".join(details)
        )

    # 3. Application des contraintes NOT NULL
    op.alter_column('entites_localisation', 'latitude',
                    existing_type=sa.Float(), nullable=False)
    op.alter_column('entites_localisation', 'longitude',
                    existing_type=sa.Float(), nullable=False)


def downgrade():
    op.alter_column('entites_localisation', 'latitude',
                    existing_type=sa.Float(), nullable=True)
    op.alter_column('entites_localisation', 'longitude',
                    existing_type=sa.Float(), nullable=True)
