"""
Routes du portail entreprise pour ARTCI DCP Platform.
Dashboard, demande, feedbacks, rapports, renouvellement, profil.
10 endpoints, @entreprise_auth_required.
"""
from flask import Blueprint, request, g
from marshmallow import ValidationError
from app.schemas.entite import EntiteCreateInputSchema, EntiteUpdateInputSchema, EntiteDetailOutputSchema
from app.schemas.workflow import FeedbackOutputSchema
from app.services.entreprise_service import EntrepriseService
from app.utils.decorators import entreprise_auth_required
from app.utils.responses import (
    success_response, created_response, error_response,
    validation_error_response, no_content_response
)


entreprise_bp = Blueprint('entreprise', __name__)


@entreprise_bp.route('/dashboard', methods=['GET'])
@entreprise_auth_required
def dashboard():
    """Dashboard workflow 3 étapes."""
    result = EntrepriseService.get_dashboard(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/mon-dossier', methods=['GET'])
@entreprise_auth_required
def mon_dossier():
    """Dossier complet de l'entreprise."""
    result = EntrepriseService.get_mon_dossier(g.current_user_id)
    if not result:
        return error_response('Aucun dossier trouvé. Créez une demande.', 404)
    return success_response(result)


@entreprise_bp.route('/demande', methods=['POST'])
@entreprise_auth_required
def create_demande():
    """Créer une nouvelle demande (formulaire 50 questions)."""
    schema = EntiteCreateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        entite = EntrepriseService.create_demande(g.current_user_id, data)
        return created_response(
            EntiteDetailOutputSchema().dump(entite),
            'Demande créée avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 409)


@entreprise_bp.route('/demande/<string:entite_id>', methods=['PUT'])
@entreprise_auth_required
def update_demande(entite_id):
    """Modifier une demande (brouillon seulement)."""
    schema = EntiteUpdateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        entite = EntrepriseService.update_demande(
            g.current_user_id, entite_id, data
        )
        return success_response(
            EntiteDetailOutputSchema().dump(entite),
            'Demande mise à jour.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@entreprise_bp.route('/demande/<string:entite_id>/soumettre', methods=['POST'])
@entreprise_auth_required
def soumettre_demande(entite_id):
    """Soumettre une demande (brouillon -> soumis)."""
    try:
        EntrepriseService.soumettre_demande(g.current_user_id, entite_id)
        return success_response(message='Demande soumise avec succès.')
    except ValueError as e:
        return error_response(str(e), 400)


@entreprise_bp.route('/feedbacks', methods=['GET'])
@entreprise_auth_required
def get_feedbacks():
    """Voir les feedbacks ARTCI."""
    result = EntrepriseService.get_feedbacks(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/rapports', methods=['POST'])
@entreprise_auth_required
def soumettre_rapport():
    """Soumettre un rapport d'activité (réservé aux conformes)."""
    if 'file' not in request.files:
        return error_response('Aucun fichier fourni.', 400)

    file = request.files['file']
    if not file.filename:
        return error_response('Nom de fichier vide.', 400)

    type_document = request.form.get('type_document', 'rapport_activite')

    try:
        doc = EntrepriseService.soumettre_rapport(
            g.current_user_id, file, type_document
        )
        return created_response(
            {'id': doc.id, 'nom_fichier': doc.nom_fichier},
            'Rapport soumis avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@entreprise_bp.route('/renouvellement', methods=['POST'])
@entreprise_auth_required
def demander_renouvellement():
    """Demander un renouvellement (réservé aux conformes)."""
    data = request.get_json()
    if not data:
        return error_response('Données requises.', 400)

    try:
        renouvellement = EntrepriseService.demander_renouvellement(
            g.current_user_id, data
        )
        return created_response(
            {'id': renouvellement.id, 'statut': renouvellement.statut.value},
            'Demande de renouvellement créée.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@entreprise_bp.route('/profil', methods=['GET'])
@entreprise_auth_required
def get_profil():
    """Mon profil entreprise."""
    result = EntrepriseService.get_profil(g.current_user_id)
    if not result:
        return error_response('Profil non trouvé.', 404)
    return success_response(result)


@entreprise_bp.route('/profil', methods=['PUT'])
@entreprise_auth_required
def update_profil():
    """Modifier le profil entreprise."""
    data = request.get_json()
    if not data:
        return error_response('Données requises.', 400)

    try:
        result = EntrepriseService.update_profil(g.current_user_id, data)
        return success_response(result, 'Profil mis à jour.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Rapprochements ---

@entreprise_bp.route('/rapprochements', methods=['GET'])
@entreprise_auth_required
def get_rapprochements():
    """Liste des demandes de rapprochement de l'entreprise."""
    result = EntrepriseService.get_rapprochements(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/rapprochement', methods=['POST'])
@entreprise_auth_required
def create_rapprochement():
    """Soumettre une demande de rapprochement."""
    numero_cc = request.form.get('numero_cc')
    raison = request.form.get('raison')

    if not numero_cc or not raison:
        return error_response('Numéro CC et raison sont requis.', 400)

    file = request.files.get('justificatif')

    try:
        result = EntrepriseService.create_rapprochement(
            g.current_user_id, numero_cc, raison, file
        )
        return created_response(result, 'Demande de rapprochement créée.')
    except ValueError as e:
        return error_response(str(e), 400)
