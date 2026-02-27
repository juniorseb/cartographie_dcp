"""
Utilitaires d'export pour ARTCI DCP Platform.
Génération de fichiers Excel, CSV, PDF à partir des données entités.
"""
import io
from datetime import datetime
from flask import send_file
import pandas as pd


def prepare_export_data(entites):
    """
    Convertir une liste d'objets EntiteBase en dicts plats pour l'export.
    """
    rows = []
    for e in entites:
        row = {
            'Entité': e.denomination,
            'N° CC': e.numero_cc,
            'Forme juridique': e.forme_juridique or '',
            'Secteur d\'activité': e.secteur_activite or '',
            'Adresse': e.adresse or '',
            'Ville': e.ville or '',
            'Région': e.region or '',
            'Téléphone': e.telephone or '',
            'Email': e.email or '',
            'Statut conformité': (
                e.conformite.statut_conformite.value
                if e.conformite and e.conformite.statut_conformite
                else ''
            ),
            'Score': e.conformite.score_conformite if e.conformite else '',
            'DPO': 'Oui' if (e.conformite and e.conformite.a_dpo) else 'Non',
            'Autorisation ARTCI': (
                e.workflow.numero_autorisation_artci
                if e.workflow and e.workflow.numero_autorisation_artci
                else ''
            ),
        }
        rows.append(row)
    return rows


def export_to_excel(data, filename=None):
    """Générer un fichier Excel et retourner une réponse Flask."""
    if filename is None:
        filename = f'entites_conformes_{datetime.now().strftime("%Y%m%d")}.xlsx'

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Entités')
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


def export_to_csv(data, filename=None):
    """Générer un fichier CSV (UTF-8 BOM) et retourner une réponse Flask."""
    if filename is None:
        filename = f'entites_conformes_{datetime.now().strftime("%Y%m%d")}.csv'

    df = pd.DataFrame(data)
    output = io.BytesIO()
    # BOM UTF-8 pour compatibilité Excel
    output.write(b'\xef\xbb\xbf')
    output.write(df.to_csv(index=False).encode('utf-8'))
    output.seek(0)

    return send_file(
        output,
        mimetype='text/csv; charset=utf-8',
        as_attachment=True,
        download_name=filename
    )


def export_to_pdf(data, filename=None):
    """
    Générer un fichier PDF basique avec les données tabulaires.
    Utilise une approche HTML simple convertie en PDF-like via reportlab si disponible,
    sinon retourne un CSV comme fallback.
    """
    if filename is None:
        filename = f'entites_conformes_{datetime.now().strftime("%Y%m%d")}.pdf'

    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(A4))
        styles = getSampleStyleSheet()
        elements = []

        # Titre
        elements.append(Paragraph('ARTCI - Entités Conformes', styles['Title']))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(
            f'Date d\'export : {datetime.now().strftime("%d/%m/%Y %H:%M")}',
            styles['Normal']
        ))
        elements.append(Spacer(1, 20))

        if data:
            # Colonnes réduites pour le PDF
            cols = ['Entité', 'N° CC', 'Secteur d\'activité', 'Ville', 'Statut conformité', 'DPO']
            table_data = [cols]
            for row in data:
                table_data.append([str(row.get(c, ''))[:40] for c in cols])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF8C00')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ]))
            elements.append(table)

        doc.build(elements)
        output.seek(0)

        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except ImportError:
        # Fallback : retourner CSV si reportlab non installé
        return export_to_csv(data, filename.replace('.pdf', '.csv'))
