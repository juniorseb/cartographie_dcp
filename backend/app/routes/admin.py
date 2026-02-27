"""
Routes admin ARTCI pour ARTCI DCP Platform.
Stats, gestion entités, workflow, utilisateurs, import Excel, logs.
18 endpoints avec RBAC via @role_required.
"""
from flask import Blueprint, request, g
from marshmallow import ValidationError
from app.schemas.entite import (
    EntiteCreateInputSchema, EntiteUpdateInputSchema,
    EntiteDetailOutputSchema, EntiteListOutputSchema
)
from app.schemas.user import UserCreateInputSchema, UserUpdateInputSchema, UserOutputSchema
from app.schemas.workflow import (
    AssignationCreateInputSchema, AssignationUpdateInputSchema, AssignationOutputSchema,
    FeedbackCreateInputSchema, ValidationN1InputSchema, HistoriqueStatutOutputSchema
)
from app.services.admin_service import AdminService
from app.services.workflow_service import WorkflowService
from app.utils.decorators import role_required, admin_or_above, editor_or_above
from app.utils.responses import (
    success_response, created_response, error_response,
    validation_error_response, no_content_response
)


admin_bp = Blueprint('admin', __name__)


# --- Dashboard & Stats ---

@admin_bp.route('/dashboard', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def dashboard():
    """Statistiques admin avec filtres optionnels."""
    filters = {
        'date_debut': request.args.get('date_debut'),
        'date_fin': request.args.get('date_fin'),
    }
    filters = {k: v for k, v in filters.items() if v}
    stats = AdminService.get_dashboard_stats(filters or None)
    return success_response(stats)


@admin_bp.route('/stats', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def stats():
    """Stats avancées avec filtres de période."""
    filters = {
        'date_debut': request.args.get('date_debut'),
        'date_fin': request.args.get('date_fin'),
    }
    filters = {k: v for k, v in filters.items() if v}
    stats = AdminService.get_dashboard_stats(filters or None)
    return success_response(stats)


# --- Gestion des entités ---

@admin_bp.route('/entites', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_entites():
    """Liste toutes les entités (tous statuts) avec filtres."""
    filters = {
        'search': request.args.get('search'),
        'secteur_activite': request.args.get('secteur_activite'),
        'ville': request.args.get('ville'),
        'region': request.args.get('region'),
        'forme_juridique': request.args.get('forme_juridique'),
        'statut_workflow': request.args.get('statut_workflow'),
        'statut_conformite': request.args.get('statut_conformite'),
        'origine_saisie': request.args.get('origine_saisie'),
    }
    filters = {k: v for k, v in filters.items() if v}

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    result = AdminService.list_all_entites(
        filters=filters or None, page=page, per_page=per_page
    )
    return success_response(result)


@admin_bp.route('/entites/<string:entite_id>', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def get_entite(entite_id):
    """Détail complet d'une entité (vue admin)."""
    result = AdminService.get_entite_detail(entite_id)
    if not result:
        return error_response('Entité non trouvée.', 404)
    return success_response(result)


@admin_bp.route('/entites', methods=['POST'])
@editor_or_above
def create_entite():
    """Créer une entité via saisie ARTCI."""
    schema = EntiteCreateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        entite = AdminService.create_entite_artci(g.current_user_id, data)
        return created_response(
            EntiteDetailOutputSchema().dump(entite),
            'Entité créée avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>', methods=['PUT'])
@editor_or_above
def update_entite(entite_id):
    """Modifier une entité (admin)."""
    schema = EntiteUpdateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        entite = AdminService.update_entite(
            entite_id, g.current_user_id, data
        )
        return success_response(
            EntiteDetailOutputSchema().dump(entite),
            'Entité mise à jour.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


# --- Panier & Assignations ---

@admin_bp.route('/panier', methods=['GET'])
@editor_or_above
def get_panier():
    """Mon panier de demandes assignées."""
    result = AdminService.get_panier(g.current_user_id)
    return success_response(result)


@admin_bp.route('/assignation', methods=['POST'])
@admin_or_above
def assigner_demande():
    """Assigner une demande soumise à un agent."""
    schema = AssignationCreateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        assignation = WorkflowService.assign_demande(
            data['entite_id'], data['agent_id'],
            data['echeance'], g.current_user_id
        )
        return created_response(
            AssignationOutputSchema().dump(assignation),
            'Demande assignée avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/assignation/<string:assignation_id>', methods=['PUT'])
@editor_or_above
def traiter_assignation(assignation_id):
    """Marquer une assignation comme traitée."""
    try:
        assignation = WorkflowService.traiter_assignation(
            assignation_id, g.current_user_id
        )
        return success_response(
            AssignationOutputSchema().dump(assignation),
            'Assignation traitée, en attente de validation N+1.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


# --- Validation N+1 ---

@admin_bp.route('/validation-n1', methods=['GET'])
@admin_or_above
def get_demandes_a_valider():
    """Demandes en attente de validation N+1."""
    demandes = WorkflowService.get_demandes_a_valider()
    return success_response(
        AssignationOutputSchema(many=True).dump(demandes)
    )


@admin_bp.route('/validation-n1/<string:assignation_id>', methods=['PUT'])
@admin_or_above
def valider_n1(assignation_id):
    """Valider ou renvoyer une demande (N+1)."""
    schema = ValidationN1InputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        assignation = WorkflowService.valider_n1(
            assignation_id, g.current_user_id,
            data['action'], data.get('commentaire')
        )
        return success_response(
            AssignationOutputSchema().dump(assignation),
            'Validation effectuée.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


# --- Feedbacks ---

@admin_bp.route('/feedbacks', methods=['POST'])
@editor_or_above
def add_feedback():
    """Ajouter un feedback de vérification."""
    schema = FeedbackCreateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        feedback = AdminService.add_feedback(g.current_user_id, data)
        return created_response(
            {'id': feedback.id},
            'Feedback ajouté avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


# --- Gestion utilisateurs ARTCI ---

@admin_bp.route('/users', methods=['GET'])
@admin_or_above
def list_users():
    """Liste paginée des utilisateurs ARTCI."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = AdminService.list_users(page=page, per_page=per_page)
    return success_response(result)


@admin_bp.route('/users', methods=['POST'])
@admin_or_above
def create_user():
    """Créer un utilisateur ARTCI."""
    schema = UserCreateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        user = AdminService.create_user(data)
        return created_response(
            UserOutputSchema().dump(user),
            'Utilisateur créé avec succès.'
        )
    except ValueError as e:
        return error_response(str(e), 409)


@admin_bp.route('/users/<string:user_id>', methods=['PUT'])
@admin_or_above
def update_user(user_id):
    """Modifier un utilisateur ARTCI."""
    schema = UserUpdateInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        user = AdminService.update_user(user_id, data)
        return success_response(
            UserOutputSchema().dump(user),
            'Utilisateur mis à jour.'
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/users/<string:user_id>', methods=['DELETE'])
@admin_or_above
def deactivate_user(user_id):
    """Désactiver un utilisateur (soft delete)."""
    try:
        AdminService.deactivate_user(user_id)
        return no_content_response()
    except ValueError as e:
        return error_response(str(e), 404)


# --- Import Excel ---

@admin_bp.route('/import', methods=['POST'])
@admin_or_above
def import_excel():
    """Importer des entités depuis un fichier Excel."""
    if 'file' not in request.files:
        return error_response('Aucun fichier fourni.', 400)

    file = request.files['file']
    if not file.filename:
        return error_response('Nom de fichier vide.', 400)

    if not file.filename.endswith(('.xlsx', '.xls')):
        return error_response('Format de fichier non supporté. Utilisez .xlsx ou .xls.', 400)

    try:
        result = AdminService.import_excel(file, g.current_user_id)
        return success_response(result, f'{result["imported"]} entités importées.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Logs ---

@admin_bp.route('/logs', methods=['GET'])
@admin_or_above
def get_logs():
    """Historique des changements de statut."""
    filters = {
        'entite_id': request.args.get('entite_id'),
        'modifie_par': request.args.get('modifie_par'),
    }
    filters = {k: v for k, v in filters.items() if v}

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    result = AdminService.get_historique_actions(
        filters=filters or None, page=page, per_page=per_page
    )
    return success_response(result)


# --- Rapprochements ---

@admin_bp.route('/rapprochements', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_rapprochements():
    """Liste paginée des demandes de rapprochement."""
    filters = {
        'search': request.args.get('search'),
        'statut': request.args.get('statut'),
    }
    filters = {k: v for k, v in filters.items() if v}
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = AdminService.list_rapprochements(filters=filters or None, page=page, per_page=per_page)
    return success_response(result)


@admin_bp.route('/rapprochements/<string:rapprochement_id>', methods=['PUT'])
@admin_or_above
def traiter_rapprochement(rapprochement_id):
    """Approuver ou rejeter une demande de rapprochement."""
    data = request.get_json()
    if not data or 'action' not in data:
        return error_response('Action requise (approuver/rejeter).', 400)
    try:
        result = AdminService.traiter_rapprochement(
            rapprochement_id, g.current_user_id, data
        )
        return success_response(result, 'Rapprochement traité.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Renouvellements ---

@admin_bp.route('/renouvellements', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_renouvellements():
    """Liste paginée des demandes de renouvellement."""
    filters = {
        'search': request.args.get('search'),
        'statut': request.args.get('statut'),
    }
    filters = {k: v for k, v in filters.items() if v}
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = AdminService.list_renouvellements(filters=filters or None, page=page, per_page=per_page)
    return success_response(result)


@admin_bp.route('/renouvellements/<string:renouvellement_id>', methods=['PUT'])
@admin_or_above
def traiter_renouvellement(renouvellement_id):
    """Approuver ou rejeter une demande de renouvellement."""
    data = request.get_json()
    if not data or 'action' not in data:
        return error_response('Action requise (approuver/rejeter).', 400)
    try:
        result = AdminService.traiter_renouvellement(
            renouvellement_id, g.current_user_id, data
        )
        return success_response(result, 'Renouvellement traité.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Rapports d'activité ---

@admin_bp.route('/rapports', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_rapports():
    """Liste paginée des rapports d'activité soumis."""
    filters = {
        'search': request.args.get('search'),
        'statut': request.args.get('statut'),
    }
    filters = {k: v for k, v in filters.items() if v}
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = AdminService.list_rapports(filters=filters or None, page=page, per_page=per_page)
    return success_response(result)


@admin_bp.route('/rapports/<string:document_id>', methods=['PUT'])
@admin_or_above
def traiter_rapport(document_id):
    """Valider ou rejeter un rapport d'activité."""
    data = request.get_json()
    if not data or 'action' not in data:
        return error_response('Action requise (valider/rejeter).', 400)
    try:
        result = AdminService.traiter_rapport(
            document_id, g.current_user_id, data
        )
        return success_response(result, 'Rapport traité.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Notifications ---

@admin_bp.route('/notifications', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_notifications():
    """Notifications du user connecté."""
    filters = {
        'type': request.args.get('type'),
        'lue': request.args.get('lue'),
    }
    filters = {k: v for k, v in filters.items() if v is not None and v != ''}
    result = AdminService.list_notifications(g.current_user_id, filters=filters or None)
    return success_response(result)


@admin_bp.route('/notifications/<string:notification_id>/read', methods=['PUT'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def mark_notification_read(notification_id):
    """Marquer une notification comme lue."""
    try:
        AdminService.mark_notification_read(notification_id, g.current_user_id)
        return success_response(message='Notification marquée comme lue.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Feedbacks listing (admin view) ---

@admin_bp.route('/feedbacks', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_feedbacks():
    """Liste paginée de tous les feedbacks de vérification."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = AdminService.list_feedbacks(page=page, per_page=per_page)
    return success_response(result)
