"""
Rattrapage : cree les reponses du formulaire DCP (table formulaires_dcp) des
entites deja importees depuis le fichier de recensement ARTCI.

Contexte : l'import initial ne remplissait que les tables normalisees ; le
formulaire (vue admin et entreprise) apparaissait vide pour ces entites.

- Relit le meme fichier Excel, avec le meme nettoyage que l'import
  (scripts/import_recensement_reel.py) -> memes N° CC (y compris AUTO-xxxx).
- Retrouve chaque entite par son N° CC.
- N'ecrase JAMAIS un formulaire deja renseigne (option --remplacer pour forcer).
- Mode --dry-run : n'ecrit rien, affiche seulement le bilan.

Lance via : python scripts/backfill_formulaires_recensement.py <fichier.xlsx> [--dry-run] [--remplacer]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import EntiteBase, FormulaireDCP  # noqa: E402
from app.services.import_boloforms_service import creer_formulaire_depuis_ligne  # noqa: E402
from import_recensement_reel import charger_et_nettoyer, COL_NUMERO_CC  # noqa: E402


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry_run = '--dry-run' in sys.argv
    remplacer = '--remplacer' in sys.argv
    if not args or not os.path.isfile(args[0]):
        print('Usage : python scripts/backfill_formulaires_recensement.py <fichier.xlsx> [--dry-run] [--remplacer]')
        sys.exit(1)

    header, rows, rapport = charger_et_nettoyer(os.path.abspath(args[0]))
    print(f"Lignes retenues dans le fichier : {rapport['lignes_retenues']}")

    app = create_app()
    with app.app_context():
        db.engine.echo = False
        ecrits = deja = introuvables = 0
        for row in rows:
            cc = row[COL_NUMERO_CC - 1].strip()
            entite = EntiteBase.query.filter_by(numero_cc=cc).first()
            if not entite:
                introuvables += 1
                continue
            form = FormulaireDCP.query.get(entite.id)
            if form and form.reponses and not remplacer:
                deja += 1
                continue
            if dry_run:
                ecrits += 1
                continue
            if creer_formulaire_depuis_ligne(entite, row, remplacer=remplacer):
                ecrits += 1

        mode = ' (simulation, rien ecrit)' if dry_run else ''
        print(f'Formulaires crees{mode} : {ecrits}')
        print(f'Deja renseignes (non modifies) : {deja}')
        print(f'Lignes sans entite correspondante : {introuvables}')
        print(f'Total formulaires en base : {FormulaireDCP.query.count()}')


if __name__ == '__main__':
    main()
