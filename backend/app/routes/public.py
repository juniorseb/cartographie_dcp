"""
Routes publiques pour ARTCI DCP Platform.
Entités conformes, statistiques, export, téléchargement documents.
5 endpoints, pas d'authentification requise.
"""
import os
from flask import Blueprint, request, send_file, current_app
from app.services.public_service import PublicService
from app.utils.responses import success_response, error_response
from app.extensions import db
from app.models.documents_joints import DocumentJoint
from app.models.enums import TypeDocumentEnum


public_bp = Blueprint('public', __name__)


@public_bp.route('/entites', methods=['GET'])
def list_entites():
    """Liste paginée des entités conformes publiées."""
    filters = {
        'search': request.args.get('search'),
        'secteur_activite': request.args.get('secteur_activite'),
        'ville': request.args.get('ville'),
        'region': request.args.get('region'),
        'forme_juridique': request.args.get('forme_juridique'),
        'statut_conformite': request.args.get('statut_conformite'),
        'volume_donnees': request.args.get('volume_donnees'),
    }
    # Nettoyer les filtres None
    filters = {k: v for k, v in filters.items() if v}

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    result = PublicService.get_entites_conformes(
        filters=filters or None, page=page, per_page=per_page
    )
    return success_response(result)


@public_bp.route('/entites/<string:entite_id>', methods=['GET'])
def get_entite_detail(entite_id):
    """Fiche détaillée publique d'une entité conforme."""
    result = PublicService.get_entite_public_detail(entite_id)
    if not result:
        return error_response('Entité non trouvée ou non conforme.', 404)
    return success_response(result)


@public_bp.route('/stats', methods=['GET'])
def get_stats():
    """Statistiques agrégées publiques."""
    stats = PublicService.get_public_stats()
    return success_response(stats)


@public_bp.route('/export', methods=['GET'])
def export_entites():
    """Export des entités conformes en Excel, CSV ou PDF."""
    format_type = request.args.get('format', 'excel')

    filters = {
        'search': request.args.get('search'),
        'secteur_activite': request.args.get('secteur_activite'),
        'ville': request.args.get('ville'),
        'region': request.args.get('region'),
    }
    filters = {k: v for k, v in filters.items() if v}

    try:
        file_data = PublicService.export_entites(
            format_type, filters=filters or None
        )
        mime_types = {
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv; charset=utf-8',
            'pdf': 'application/pdf',
        }
        extensions = {'excel': 'xlsx', 'csv': 'csv', 'pdf': 'pdf'}

        return send_file(
            file_data,
            mimetype=mime_types.get(format_type, 'application/octet-stream'),
            as_attachment=True,
            download_name=f'entites_conformes.{extensions.get(format_type, "xlsx")}'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@public_bp.route('/documents/<string:document_id>/download', methods=['GET'])
def download_document(document_id):
    """Télécharger un document public (autorisation uniquement)."""
    doc = db.session.get(DocumentJoint, document_id)
    if not doc:
        return error_response('Document non trouvé.', 404)

    # Seuls les documents de type "autorisation" sont téléchargeables publiquement
    if doc.type_document != TypeDocumentEnum.autorisation:
        return error_response('Ce document n\'est pas accessible publiquement.', 403)

    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.chemin_fichier)
    if not os.path.exists(file_path):
        return error_response('Fichier introuvable sur le serveur.', 404)

    return send_file(
        file_path,
        mimetype=doc.mime_type or 'application/pdf',
        as_attachment=True,
        download_name=doc.nom_fichier
    )
