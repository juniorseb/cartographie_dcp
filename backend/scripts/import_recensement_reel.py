"""
Import des donnees reelles de recensement (96 entites) depuis le fichier Excel
fourni par l'ARTCI, feuille "BASE DE DONNEES" (171 colonnes, meme format que
l'export BoloForms/Google Forms deja gere par
app.services.import_boloforms_service.import_boloforms_csv).

On ne reecrit pas le mapping des 171 colonnes (deja en place et verifie
colonne par colonne) : ce script nettoie la feuille Excel (numeros de compte
contribuable manquants/invalides, lignes dupliquees) puis la convertit en CSV
en memoire pour reutiliser l'import existant tel quel.

Lance via : python scripts/import_recensement_reel.py [chemin_du_xlsx]
"""
import csv
import io
import os
import re
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.models import User  # noqa: E402
from app.models.enums import RoleEnum  # noqa: E402
from app.services.import_boloforms_service import import_boloforms_csv  # noqa: E402

SHEET_NAME = 'BASE DE DONNEES'
NB_COLONNES = 171
COL_NUMERO_CC = 19  # 1-based, cf. COL['numero_cc'] dans import_boloforms_service
COL_DENOMINATION = 17

# Valeurs qui signifient "pas de N CC", a remplacer par un identifiant genere
# plutot que de laisser plusieurs entites distinctes entrer en collision.
CC_INVALIDES = {'', 'n/a', 'neant', 'néant', '-', 'aucun', 'non applicable'}

DEFAULT_XLSX = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '..',
    "QUESTIONNAIRE_DE_RECENSEMENT_ET_D_ÉVALUATION_DE_LA_CONFORMITÉ_standardisé (1).xlsx",
)


def _cell_to_str(value):
    """Convertit une cellule openpyxl en texte pour le CSV, en formattant les
    dates au format attendu par import_boloforms_service._date()."""
    if value is None:
        return ''
    if isinstance(value, datetime):
        return value.strftime('%d/%m/%Y %H:%M:%S')
    if isinstance(value, date):
        return value.strftime('%d/%m/%Y')
    return str(value)


def _est_cc_invalide(raw):
    if raw is None:
        return True
    normalized = str(raw).strip().lower()
    return normalized in CC_INVALIDES


def charger_et_nettoyer(xlsx_path):
    """Lit la feuille BASE DE DONNEES, nettoie les N CC manquants et les
    lignes dupliquees, retourne (header_row, rows_nettoyees, rapport)."""
    import openpyxl

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[SHEET_NAME]

    header = [_cell_to_str(ws.cell(row=1, column=c).value) for c in range(1, NB_COLONNES + 1)]

    rows = []
    seen_cc = {}
    nb_cc_generes = 0
    nb_doublons = 0

    for r in range(2, ws.max_row + 1):
        row = [_cell_to_str(ws.cell(row=r, column=c).value) for c in range(1, NB_COLONNES + 1)]
        denomination = row[COL_DENOMINATION - 1].strip()
        if not denomination:
            continue  # ligne vide en fin de feuille

        cc_brut = row[COL_NUMERO_CC - 1].strip()

        if _est_cc_invalide(cc_brut):
            row[COL_NUMERO_CC - 1] = f'AUTO-{r:04d}'
            nb_cc_generes += 1
        else:
            # CC reel : deux entites distinctes ne peuvent legalement pas
            # partager le meme N CC -> une repetition exacte = ligne dupliquee
            # dans le classeur (verifie : meme horodateur, meme denomination).
            if cc_brut in seen_cc:
                nb_doublons += 1
                continue
            seen_cc[cc_brut] = r

        rows.append(row)

    rapport = {
        'lignes_source': ws.max_row - 1,
        'lignes_retenues': len(rows),
        'cc_generes': nb_cc_generes,
        'doublons_ignores': nb_doublons,
    }
    return header, rows, rapport


def rows_vers_csv(header, rows):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    buf.seek(0)
    return buf


def main():
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    xlsx_path = os.path.abspath(xlsx_path)
    if not os.path.isfile(xlsx_path):
        print(f"Fichier introuvable : {xlsx_path}")
        sys.exit(1)

    print(f"=== Import du recensement reel ===\nFichier : {xlsx_path}\n")

    header, rows, rapport = charger_et_nettoyer(xlsx_path)
    print(
        f"Lignes source : {rapport['lignes_source']} | "
        f"retenues : {rapport['lignes_retenues']} | "
        f"N CC generes (manquants/invalides) : {rapport['cc_generes']} | "
        f"doublons exacts ignores : {rapport['doublons_ignores']}\n"
    )

    csv_stream = rows_vers_csv(header, rows)

    app = create_app()
    with app.app_context():
        admin = User.query.filter(
            User.role.in_([RoleEnum.super_admin, RoleEnum.admin])
        ).first()
        if not admin:
            print("Aucun utilisateur admin/super_admin trouve en base - lancez seed_users_only.py d'abord.")
            sys.exit(1)

        result = import_boloforms_csv(csv_stream, admin.id)

    print(f"Importees : {result['imported']}")
    print(f"Ignorees (deja en base / sans denomination) : {result['skipped']}")
    if result['errors']:
        print(f"\nErreurs ({len(result['errors'])}) :")
        for err in result['errors']:
            print(f"  ligne {err['row']} : {err['message']}")


if __name__ == '__main__':
    main()
