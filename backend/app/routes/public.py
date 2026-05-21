"""
Routes publiques pour ARTCI DCP Platform.
Entités conformes, statistiques, export, téléchargement documents, contact.
"""
import os
import re
from flask import Blueprint, request, send_file, current_app
from app.services.public_service import PublicService
from app.utils.responses import success_response, error_response, created_response
from app.extensions import db
from app.models.documents_joints import DocumentJoint
from app.models.contact_messages import ContactMessage
from app.models.enums import TypeDocumentEnum


public_bp = Blueprint('public', __name__)


EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


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


@public_bp.route('/entites_publiees', methods=['GET'])
def list_entites_publiees_anonymise():
    """Endpoint public RGPD-safe (manœuvre E).

    Projection MINIMALE : raison sociale, secteur, commune/region, statut,
    date de publication, lat/lng pour la carte. AUCUN detail de cartographie,
    aucun DPO, aucun sous-traitant, aucun transfert. Ce qu'un citoyen lambda
    a besoin de voir pour verifier qu'une entreprise est declaree.

    Filtres : ?secteur=...&region=...&statut=conforme|partiellement_conforme
    Pagination : ?page=N&per_page=M (max 200)
    """
    from app.models import EntiteBase, EntiteConformite, EntiteWorkflow, EntiteLocalisation
    from app.models.enums import StatutConformiteEnum, StatutWorkflowEnum
    from sqlalchemy.orm import joinedload

    secteur = request.args.get('secteur')
    region = request.args.get('region')
    statut_filter = request.args.get('statut')  # conforme | partiellement_conforme
    page = max(1, request.args.get('page', 1, type=int))
    per_page = min(200, max(1, request.args.get('per_page', 50, type=int)))

    # Filtre de base : publiees, non archivees, statut conformite eligible
    q = (
        EntiteBase.query
        .options(
            joinedload(EntiteBase.conformite),
            joinedload(EntiteBase.localisation),
            joinedload(EntiteBase.workflow),
        )
        .filter(
            EntiteBase.publie_sur_carte == True,  # noqa: E712
            EntiteBase.archive == False,  # noqa: E712
        )
    )

    # Filtres optionnels
    if secteur:
        q = q.filter(EntiteBase.secteur_activite == secteur)
    if region:
        q = q.filter(EntiteBase.region == region)

    # Restriction statut conformite : uniquement Conforme ou Partiellement conforme.
    # On inclut aussi les anciennes valeurs (demarche_en_cours/demarche_achevee)
    # pour compat ascendante sur les rows historiques.
    eligible_statuts = [
        StatutConformiteEnum.conforme,
        StatutConformiteEnum.partiellement_conforme,
        StatutConformiteEnum.demarche_en_cours,
        StatutConformiteEnum.demarche_achevee,
    ]
    if statut_filter == 'conforme':
        eligible_statuts = [StatutConformiteEnum.conforme]
    elif statut_filter == 'partiellement_conforme':
        eligible_statuts = [
            StatutConformiteEnum.partiellement_conforme,
            StatutConformiteEnum.demarche_en_cours,
            StatutConformiteEnum.demarche_achevee,
        ]

    q = q.join(EntiteConformite).filter(
        EntiteConformite.statut_conformite.in_(eligible_statuts)
    )

    total = q.count()
    items = (
        q.order_by(EntiteBase.denomination.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Projection minimale - ZERO donnee sensible
    return success_response({
        'items': [{
            'id': e.id,
            # Raison sociale uniquement (pas de noms personnes)
            'denomination': e.denomination,
            'secteur_activite': e.secteur_activite,
            'ville': e.ville,
            'region': e.region,
            # Statut textuel (PAS le score chiffre)
            'statut_conformite': (
                e.conformite.statut_conformite.value
                if e.conformite and e.conformite.statut_conformite else None
            ),
            'date_publication': (
                e.workflow.date_publication.isoformat()
                if e.workflow and e.workflow.date_publication else None
            ),
            # Geolocalisation pour la carte
            'latitude': e.localisation.latitude if e.localisation else None,
            'longitude': e.localisation.longitude if e.localisation else None,
        } for e in items],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    })


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


@public_bp.route('/contact', methods=['POST'])
def submit_contact():
    """Reception d'un message du formulaire de contact public."""
    data = request.get_json()
    if not data:
        return error_response('Donnees JSON requises.', 400)

    nom = (data.get('nom') or '').strip()
    email = (data.get('email') or '').strip()
    telephone = (data.get('telephone') or '').strip() or None
    sujet = (data.get('sujet') or '').strip()
    message = (data.get('message') or '').strip()

    errors = {}
    if not nom or len(nom) < 2:
        errors['nom'] = 'Le nom est requis (2 caracteres minimum).'
    if not email or not EMAIL_RE.match(email):
        errors['email'] = 'Email invalide.'
    if not sujet:
        errors['sujet'] = 'Le sujet est requis.'
    if not message or len(message) < 10:
        errors['message'] = 'Le message est requis (10 caracteres minimum).'
    if errors:
        return error_response('Donnees invalides.', 400, errors)

    msg = ContactMessage(
        nom=nom[:200], email=email[:255], telephone=telephone,
        sujet=sujet[:255], message=message,
    )
    db.session.add(msg)
    db.session.commit()
    return created_response({'id': msg.id}, 'Message envoye.')
