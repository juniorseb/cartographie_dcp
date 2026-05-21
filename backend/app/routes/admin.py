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
    """Statistiques admin avec filtres optionnels.

    Editor : retourne le suivi de performance personnel (charge de travail,
    delai moyen, derniers traites, panier en cours) -- pas les stats globales.
    Les autres roles : stats globales avec filtres de periode.

    Filtre 'period' accepte : today / 7d / 30d / all (defaut : all).
    """
    if g.current_user_role == 'editor':
        return success_response(AdminService.get_editor_performance(g.current_user_id))

    filters = {
        'date_debut': request.args.get('date_debut'),
        'date_fin': request.args.get('date_fin'),
        'period': request.args.get('period'),
    }
    filters = {k: v for k, v in filters.items() if v}
    stats = AdminService.get_dashboard_stats(filters or None)
    return success_response(stats)


@admin_bp.route('/stats', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def stats():
    """Stats avancées avec filtres de période.
    Editor : scope automatique aux entites qui lui sont assignees."""
    filters = {
        'date_debut': request.args.get('date_debut'),
        'date_fin': request.args.get('date_fin'),
        'period': request.args.get('period'),
    }
    filters = {k: v for k, v in filters.items() if v}
    if g.current_user_role == 'editor':
        filters['scope_user_id'] = g.current_user_id
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

    # publie_sur_carte est un filtre booleen : on accepte 'true'/'false' string
    publie_param = request.args.get('publie_sur_carte')
    if publie_param is not None:
        filters['publie_sur_carte'] = publie_param.lower() == 'true'

    # validees : ne renvoyer que les entites validees (conforme / valide / publie)
    if request.args.get('validees') == 'true':
        filters['validees_only'] = True

    # Spec : un editeur ne voit que les entites qui lui sont assignees,
    # et JAMAIS les brouillons (statut workflow 'brouillon' ou 'brouillon_artci').
    # On force le scope cote serveur, indissociable du role.
    if g.current_user_role == 'editor':
        filters['assigned_to_user_id'] = g.current_user_id
        filters['exclude_brouillons'] = True

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    sort = request.args.get('sort', 'created')  # created|activite|denomination

    # Inclure les archives uniquement sur demande explicite (admin+)
    if request.args.get('include_archives') == 'true' and g.current_user_role in ('admin', 'super_admin'):
        filters['include_archives'] = True

    result = AdminService.list_all_entites(
        filters=filters or None, page=page, per_page=per_page, sort=sort,
    )
    return success_response(result)


@admin_bp.route('/entites/<string:entite_id>', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def get_entite(entite_id):
    """Détail complet d'une entité (vue admin).
    Editor : 403 si l'entite ne lui est pas assignee."""
    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)
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


# --- Workflow Traiter (spec §6 reunion 07/05) ---

@admin_bp.route('/entites/<string:entite_id>/traiter', methods=['POST'])
@editor_or_above
def commencer_traiter(entite_id):
    """Demarre le traitement d'un dossier (cree ou recupere le TraitementDossier)."""
    from app.services.traitement_service import TraitementService
    try:
        traitement = TraitementService.get_or_create_traitement(entite_id, g.current_user_id)
        return success_response(TraitementService.serialize(traitement))
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/traitements/<string:traitement_id>', methods=['GET'])
@editor_or_above
def get_traitement(traitement_id):
    """Recuperer un traitement en cours."""
    from app.services.traitement_service import TraitementService
    from app.models import TraitementDossier
    traitement = TraitementDossier.query.get(traitement_id)
    if not traitement:
        return error_response('Traitement non trouve.', 404)
    return success_response(TraitementService.serialize(traitement))


@admin_bp.route('/traitements/<string:traitement_id>', methods=['PUT'])
@editor_or_above
def update_traitement(traitement_id):
    """Mettre a jour les commentaires et le scoring manuel."""
    from app.services.traitement_service import TraitementService
    data = request.get_json() or {}
    try:
        traitement = TraitementService.update_traitement(traitement_id, g.current_user_id, data)
        return success_response(TraitementService.serialize(traitement), 'Traitement mis a jour.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/traitements/<string:traitement_id>/soumettre', methods=['POST'])
@editor_or_above
def soumettre_traitement(traitement_id):
    """Soumettre le traitement pour validation N+1."""
    from app.services.traitement_service import TraitementService
    try:
        traitement = TraitementService.soumettre_pour_validation(traitement_id, g.current_user_id)
        return success_response(TraitementService.serialize(traitement), 'Traitement soumis pour validation.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/traitements/<string:traitement_id>/valider', methods=['POST'])
@admin_or_above
def valider_traitement(traitement_id):
    """Approuver ou retourner un traitement (validation N+1)."""
    from app.services.traitement_service import TraitementService
    data = request.get_json() or {}
    decision = data.get('decision')
    motif = data.get('motif')
    if decision not in ('approuve', 'retourne'):
        return error_response('Decision invalide (approuve ou retourne).', 400)
    if decision == 'retourne' and not motif:
        return error_response('Motif requis pour retourner le dossier.', 400)
    try:
        traitement = TraitementService.valider_traitement(
            traitement_id, g.current_user_id, decision, motif
        )
        return success_response(TraitementService.serialize(traitement), 'Decision enregistree.')
    except ValueError as e:
        return error_response(str(e), 400)


# --- Backup (sauvegarde DB en JSON) ---

@admin_bp.route('/backup', methods=['GET'])
@role_required('super_admin')
def list_backups():
    """Liste les fichiers de backup disponibles."""
    result = AdminService.list_backups()
    return success_response(result)


@admin_bp.route('/backup', methods=['POST'])
@role_required('super_admin')
def create_backup():
    """Cree un backup manuel de la base (dump JSON)."""
    try:
        result = AdminService.create_backup(g.current_user_id)
        return created_response(result, 'Backup cree.')
    except Exception as e:
        return error_response(f'Erreur lors de la creation du backup : {e}', 500)


@admin_bp.route('/backup/<string:filename>', methods=['GET'])
@role_required('super_admin')
def download_backup(filename):
    """Telecharge un fichier de backup."""
    import os
    from flask import send_file, current_app
    upload_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'backups')
    # Securite : empecher le path traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return error_response('Nom de fichier invalide.', 400)
    file_path = os.path.join(upload_folder, filename)
    if not os.path.exists(file_path):
        return error_response('Backup introuvable.', 404)
    return send_file(file_path, as_attachment=True, download_name=filename)


# --- Suivi d'activite des agents (spec §5.1, §5.2) ---

@admin_bp.route('/agents/activity', methods=['GET'])
@admin_or_above
def get_agents_activity():
    """Tableau de performance des agents (Admin / Super Admin uniquement)."""
    result = AdminService.get_agents_activity()
    return success_response(result)


# --- Retour formulaire entreprise (spec §5.1 - reserve Super Admin) ---

@admin_bp.route('/entites/<string:entite_id>/retour-formulaire', methods=['POST'])
@role_required('super_admin')
def retour_formulaire_entreprise(entite_id):
    """Le Super Admin retourne le formulaire a l'entreprise pour correction.
    Spec §5.1 : action reservee au Super Admin uniquement."""
    from app.models import EntiteBase, EntiteWorkflow, Notification
    from app.models.enums import StatutWorkflowEnum
    data = request.get_json() or {}
    motif = (data.get('motif') or '').strip()
    if not motif:
        return error_response('Motif de retour requis.', 400)

    entite = EntiteBase.query.get(entite_id)
    if not entite:
        return error_response('Entité non trouvée.', 404)

    wf = EntiteWorkflow.query.get(entite_id)
    if wf:
        wf.statut = StatutWorkflowEnum.en_attente_complements
        wf.motif_rejet = motif

    # Notifier l'entreprise
    if entite.compte_entreprise_id:
        n = Notification(
            destinataire_type='entreprise',
            destinataire_id=entite.compte_entreprise_id,
            type='retour_formulaire',
            titre="Votre dossier vous a été retourné",
            message=f"L'ARTCI vous demande de réviser votre dossier. Motif : {motif}",
            entite_id=entite.id,
            lue=False,
        )
        from app.extensions import db
        db.session.add(n)
    from app.extensions import db
    db.session.commit()
    return success_response({'entite_id': entite_id, 'statut': wf.statut.value if wf else None},
                            'Formulaire retourné à l\'entreprise.')


# --- Inscriptions a valider (workflow d'acces entreprise) ---

@admin_bp.route('/inscriptions', methods=['GET'])
@admin_or_above
def list_inscriptions():
    """Liste les inscriptions en attente de validation (admin+ uniquement)."""
    statut = request.args.get('statut', 'pending')
    result = AdminService.list_inscriptions(statut=statut)
    return success_response(result)


@admin_bp.route('/inscriptions/<string:compte_id>/valider', methods=['POST'])
@admin_or_above
def valider_inscription(compte_id):
    """Approuve une inscription : compte active, emails envoyes au DG et au DPO."""
    try:
        result = AdminService.valider_inscription(compte_id, g.current_user_id)
        return success_response(result, 'Inscription validee.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/inscriptions/<string:compte_id>/rejeter', methods=['POST'])
@admin_or_above
def rejeter_inscription(compte_id):
    """Rejette une inscription avec un motif (predefini + texte libre)."""
    data = request.get_json() or {}
    motif = (data.get('motif') or '').strip()
    motif_code = (data.get('motif_code') or '').strip() or None
    if not motif and not motif_code:
        return error_response('Motif de rejet requis.', 400)
    try:
        result = AdminService.rejeter_inscription(
            compte_id, g.current_user_id, motif, motif_code=motif_code
        )
        return success_response(result, 'Inscription rejetee.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/inscriptions/motifs-rejet', methods=['GET'])
@admin_or_above
def get_motifs_rejet():
    """Liste des motifs prédéfinis de rejet d'inscription."""
    return success_response({
        'motifs': [
            {'code': k, 'label': v}
            for k, v in AdminService.MOTIFS_REJET_INSCRIPTION.items()
        ]
    })


@admin_bp.route('/entites/<string:entite_id>/formalites', methods=['PUT'])
@admin_or_above
def update_formalites_activation(entite_id):
    """Active ou desactive les onglets Autorisation/Declaration d'une entreprise."""
    data = request.get_json() or {}
    autorisation = data.get('autorisation_active')
    declaration = data.get('declaration_active')
    try:
        result = AdminService.update_formalites_activation(
            entite_id, autorisation, declaration
        )
        return success_response(result, 'Formalites mises a jour.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>/publier', methods=['POST'])
@admin_or_above
def publier_entite(entite_id):
    """Publier une entite sur la cartographie publique. Seules les entites
    "Conforme" ou "Demarche en cours" peuvent etre publiees."""
    try:
        result = AdminService.publier_entite(entite_id)
        return success_response(result, 'Entite publiee.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>/depublier', methods=['POST'])
@admin_or_above
def depublier_entite(entite_id):
    """Depublier une entite de la cartographie publique."""
    try:
        result = AdminService.depublier_entite(entite_id)
        return success_response(result, 'Entite depubliee.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>/rapport-audit', methods=['POST'])
@editor_or_above
def upload_rapport_audit(entite_id):
    """Téléverser un rapport d'audit pour une entité.
    Le rapport apparaitra automatiquement dans Mon dossier > Mes Rapports
    de l'entreprise concernee."""
    if 'file' not in request.files:
        return error_response('Aucun fichier fourni.', 400)
    file = request.files['file']
    if not file.filename:
        return error_response('Nom de fichier vide.', 400)
    try:
        doc = AdminService.upload_rapport_audit(entite_id, file)
        return success_response(
            {
                'id': doc.id,
                'nom_fichier': doc.nom_fichier,
                'type_document': doc.type_document.value,
            },
            'Rapport d\'audit deposé.',
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


@admin_bp.route('/assignations', methods=['GET'])
@admin_or_above
def list_assignations():
    """Liste de toutes les assignations (vue globale admin/super-admin)."""
    result = AdminService.list_all_assignations()
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


@admin_bp.route('/import/boloforms', methods=['POST'])
@admin_or_above
def import_boloforms():
    """Importer les reponses du formulaire BoloForms / Google Forms (CSV 171 colonnes)."""
    from app.services.import_boloforms_service import import_boloforms_csv
    if 'file' not in request.files:
        return error_response('Aucun fichier fourni.', 400)
    file = request.files['file']
    if not file.filename:
        return error_response('Nom de fichier vide.', 400)
    if not file.filename.lower().endswith('.csv'):
        return error_response('Format non supporte. Utilisez un fichier .csv exporte depuis BoloForms / Google Forms.', 400)
    try:
        result = import_boloforms_csv(file.stream, g.current_user_id)
        msg = f'{result["imported"]} entites importees, {result["skipped"]} ignorees.'
        return success_response(result, msg)
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/import/template', methods=['GET'])
@editor_or_above
def download_import_template():
    """Télécharger le template Excel pré-formaté (51 colonnes)."""
    import io
    import pandas as pd

    columns = [
        # Partie 1 - Identification (9)
        'denomination', 'numero_cc', 'forme_juridique', 'secteur_activite',
        'adresse', 'ville', 'region', 'telephone', 'email',
        # Contact / Responsable légal (5)
        'responsable_legal_nom', 'responsable_legal_fonction',
        'responsable_legal_email', 'responsable_legal_telephone', 'site_web',
        # Localisation GPS (3)
        'latitude', 'longitude', 'adresse_complete',
        # Partie 2 - Cadre juridique (7)
        'connaissance_loi_2013', 'declaration_artci', 'numero_declaration',
        'date_declaration', 'autorisation_artci', 'numero_autorisation', 'date_autorisation',
        # DPO (7)
        'dpo_nom', 'dpo_prenom', 'dpo_email', 'dpo_telephone',
        'dpo_type', 'dpo_organisme', 'dpo_date_designation',
        # Partie 3 - Registre & Traitements (7)
        'traitement_description', 'traitement_finalite',
        'traitement_categories_personnes', 'traitement_destinataires',
        'traitement_transfert_hors_ci',
        'categories_donnees', 'finalite', 'base_legale',
        # Partie 4 - Sous-traitance & Transferts (10)
        'sous_traitant_nom', 'sous_traitant_pays', 'sous_traitant_donnees',
        'sous_traitant_contrat', 'sous_traitant_clauses', 'sous_traitant_audit',
        'transfert_pays', 'transfert_organisme', 'transfert_base_juridique', 'transfert_garanties',
        # Partie 5 - Sécurité (9)
        'politique_securite', 'responsable_securite', 'analyse_risques',
        'plan_continuite', 'notification_violations', 'nombre_violations',
        'formation_personnel', 'frequence_formation', 'dernier_audit',
    ]
    df = pd.DataFrame(columns=columns)
    output = io.BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)

    from flask import send_file
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='template_recensement_dcp_artci.xlsx'
    )


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


# --- Formalités (Renouvellements + Autorisations + Déclarations) ---

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
    """Liste paginée de tous les feedbacks de vérification.
    Filtre optionnel statut_echeance : overdue/today/upcoming/no_deadline/with_deadline.
    Editor : scope automatique aux feedbacks des entites qui lui sont assignees."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    statut_echeance = request.args.get('statut_echeance')
    scope_user_id = g.current_user_id if g.current_user_role == 'editor' else None
    result = AdminService.list_feedbacks(
        page=page, per_page=per_page, statut_echeance=statut_echeance,
        scope_user_id=scope_user_id,
    )
    return success_response(result)


# --- Formulaire DCP cote admin (saisie ARTCI) ---
# Permet aux agents (super_admin/admin/editor) d'editer le meme formulaire
# que cote entreprise, avec source de verite unique formulaires_dcp.

@admin_bp.route('/entites/<string:entite_id>/formulaire-dcp', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def admin_get_formulaire_dcp(entite_id):
    """Recupere les reponses au formulaire DCP d'une entite (vue admin)."""
    from app.models import EntiteBase, FormulaireDCP

    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    entite = EntiteBase.query.get(entite_id)
    if not entite:
        return error_response("Entité introuvable.", 404)
    form = FormulaireDCP.query.get(entite.id)
    return success_response({
        'entite_id': entite.id,
        'denomination': entite.denomination,
        'numero_cc': entite.numero_cc,
        'reponses': form.reponses if form else {},
        'version': form.version if form else 0,
    })


@admin_bp.route('/entites/<string:entite_id>/formulaire-dcp', methods=['PUT'])
@role_required('super_admin', 'admin', 'editor')
def admin_save_formulaire_dcp(entite_id):
    """Sauvegarde les reponses au formulaire DCP cote admin (verrouillage optimiste).
    Calcule formalite + propage lat/lng comme cote entreprise."""
    from app.extensions import db
    from app.models import EntiteBase, FormulaireDCP, EntiteLocalisation

    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    data = request.get_json() or {}
    reponses = data.get('reponses', {})
    if not isinstance(reponses, dict):
        return error_response("Les reponses doivent etre un objet.", 400)
    expected_version = data.get('version')

    entite = EntiteBase.query.get(entite_id)
    if not entite:
        return error_response("Entité introuvable.", 404)

    # Auto-calcul formalite (Autorisation vs Declaration)
    from app.services.formalite_engine import determiner_formalite
    formalite_type, motifs = determiner_formalite(reponses)
    cadre = reponses.get('cadre_juridique', {}) or {}
    cadre['formalite_calculee'] = formalite_type
    cadre['formalite_motifs'] = motifs
    reponses['cadre_juridique'] = cadre

    # Propagation lat/lng vers EntiteLocalisation
    loc = (reponses.get('identification') or {}).get('localisation') or {}
    if isinstance(loc, dict):
        lat = loc.get('latitude')
        lng = loc.get('longitude')
        if isinstance(lat, (int, float)) or isinstance(lng, (int, float)):
            geo = EntiteLocalisation.query.get(entite.id)
            if not geo:
                geo = EntiteLocalisation(
                    entite_id=entite.id,
                    methode_geolocalisation='pointage_carte',
                )
                db.session.add(geo)
            if isinstance(lat, (int, float)):
                geo.latitude = float(lat)
            if isinstance(lng, (int, float)):
                geo.longitude = float(lng)
            geo.methode_geolocalisation = 'pointage_carte'

    # Verrouillage optimiste
    form = FormulaireDCP.query.get(entite.id)
    if not form:
        form = FormulaireDCP(entite_id=entite.id, reponses=reponses, version=1)
        db.session.add(form)
    else:
        if expected_version is not None and form.version != expected_version:
            return error_response(
                f"Le dossier a été modifié pendant votre session "
                f"(version actuelle : {form.version}, vous éditez : {expected_version}). "
                "Rechargez la page pour récupérer la dernière version.",
                409,
            )
        form.reponses = reponses
        form.version = (form.version or 1) + 1
    db.session.commit()
    return success_response({
        'entite_id': entite.id,
        'reponses': form.reponses,
        'version': form.version,
        'formalite_calculee': formalite_type,
        'formalite_motifs': motifs,
    }, 'Formulaire sauvegardé.')


@admin_bp.route('/entites/saisie-artci', methods=['POST'])
@role_required('super_admin', 'admin', 'editor')
def admin_create_saisie_artci():
    """Cree une nouvelle entite en origine 'saisie_artci' avec son formulaire-dcp.
    Body : { denomination, numero_cc, reponses }
    L'entite est creee sans compte_entreprise (saisie directe agent ARTCI).
    """
    from app.extensions import db
    from app.models import EntiteBase, EntiteWorkflow, FormulaireDCP, EntiteLocalisation
    from app.models.enums import OrigineSaisieEnum, StatutWorkflowEnum

    data = request.get_json() or {}
    reponses = data.get('reponses', {}) or {}
    if not isinstance(reponses, dict):
        return error_response("Les reponses doivent etre un objet.", 400)

    # Denomination + numero_cc : on cherche dans le payload, fallback sur reponses
    identif = (reponses.get('identification') or {})
    pm = identif.get('personne_morale') or {}
    pp = identif.get('personne_physique') or {}
    denomination = (
        data.get('denomination')
        or pm.get('denomination_officielle')
        or pp.get('nom_prenom')
        or 'Entité ARTCI'
    )
    numero_cc = (
        data.get('numero_cc')
        or pm.get('numero_cc')
        or None
    )
    if not numero_cc:
        return error_response('numero_cc requis (ou champ identification.personne_morale.numero_cc).', 400)

    # Verifier doublon
    if EntiteBase.query.filter_by(numero_cc=numero_cc).first():
        return error_response(f"Une entite avec le N° CC '{numero_cc}' existe deja.", 409)

    # Calcul formalite
    from app.services.formalite_engine import determiner_formalite
    formalite_type, motifs = determiner_formalite(reponses)
    cadre = reponses.get('cadre_juridique', {}) or {}
    cadre['formalite_calculee'] = formalite_type
    cadre['formalite_motifs'] = motifs
    reponses['cadre_juridique'] = cadre

    # Creer l'entite + workflow + formulaire
    entite = EntiteBase(
        compte_entreprise_id=None,  # saisie ARTCI, pas de compte entreprise
        denomination=denomination[:255],
        numero_cc=numero_cc[:50],
        origine_saisie=OrigineSaisieEnum.saisie_artci,
        publie_sur_carte=False,
    )
    db.session.add(entite)
    db.session.flush()

    wf = EntiteWorkflow(
        entite_id=entite.id,
        statut=StatutWorkflowEnum.brouillon_artci,
        createdBy=g.current_user_id,
    )
    db.session.add(wf)

    form = FormulaireDCP(entite_id=entite.id, reponses=reponses, version=1)
    db.session.add(form)

    # Propagation lat/lng
    loc = identif.get('localisation') or {}
    if isinstance(loc, dict):
        lat = loc.get('latitude')
        lng = loc.get('longitude')
        if isinstance(lat, (int, float)) or isinstance(lng, (int, float)):
            geo = EntiteLocalisation(
                entite_id=entite.id,
                methode_geolocalisation='saisie_artci',
            )
            if isinstance(lat, (int, float)):
                geo.latitude = float(lat)
            if isinstance(lng, (int, float)):
                geo.longitude = float(lng)
            db.session.add(geo)

    db.session.commit()
    return created_response({
        'id': entite.id,
        'denomination': entite.denomination,
        'numero_cc': entite.numero_cc,
        'formalite_calculee': formalite_type,
        'version': form.version,
    }, 'Entité créée en saisie ARTCI.')


# --- Commentaires ancres + Revisions (Modele PR) ---

@admin_bp.route('/entites/<string:entite_id>/commentaires', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_commentaires(entite_id):
    """Liste les commentaires ancres d'un dossier.
    Filtre optionnel : ?etat=open|resolved, ?revision_id=...
    """
    from app.services.dossier_revision_service import DossierRevisionService
    etat = request.args.get('etat')
    revision_id = request.args.get('revision_id')
    commentaires = DossierRevisionService.lister_commentaires(
        entite_id, etat=etat, revision_id=revision_id,
    )
    return success_response({
        'items': [{
            'id': c.id,
            'entite_id': c.entite_id,
            'revision_id': c.revision_id,
            'agent_id': c.agent_id,
            'agent_nom': (
                f"{c.agent.prenom or ''} {c.agent.nom or ''}".strip()
                if c.agent else None
            ),
            'rubrique': c.rubrique,
            'sous_question': c.sous_question,
            'contenu': c.contenu,
            'etat': c.etat,
            'reponse_entreprise': c.reponse_entreprise,
            'repondu_le': c.repondu_le.isoformat() if c.repondu_le else None,
            'resolu_par': c.resolu_par,
            'resolu_le': c.resolu_le.isoformat() if c.resolu_le else None,
            'cree_le': c.cree_le.isoformat() if c.cree_le else None,
            # L1 PR : threads + edition
            'parent_id': c.parent_id,
            'auteur_role': c.auteur_role,
            'edited_at': c.edited_at.isoformat() if c.edited_at else None,
        } for c in commentaires],
    })


@admin_bp.route('/entites/<string:entite_id>/commentaires', methods=['POST'])
@role_required('super_admin', 'admin', 'editor')
def add_commentaire(entite_id):
    """Cree un commentaire ancre sur une rubrique du dossier.
    Body : { rubrique, sous_question?, contenu, revision_id?, parent_id? }
    parent_id = reponse en thread a un commentaire existant.
    """
    from app.extensions import db
    from app.services.dossier_revision_service import DossierRevisionService

    # Editor : uniquement sur ses dossiers assignes
    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    data = request.get_json() or {}
    try:
        c = DossierRevisionService.creer_commentaire(
            entite_id=entite_id,
            agent_id=g.current_user_id,
            rubrique=data.get('rubrique'),
            sous_question=data.get('sous_question'),
            contenu=data.get('contenu'),
            revision_id=data.get('revision_id'),
            parent_id=data.get('parent_id'),
            auteur_role=g.current_user_role,
        )
        db.session.commit()
        return created_response({'id': c.id, 'etat': c.etat}, 'Commentaire ajouté.')
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/commentaires/<string:commentaire_id>', methods=['PUT'])
@role_required('super_admin', 'admin', 'editor')
def editer_commentaire(commentaire_id):
    """Editer un commentaire (auteur uniquement, AVANT resolution).
    Body : { contenu }
    """
    from app.extensions import db
    from app.services.dossier_revision_service import DossierRevisionService
    data = request.get_json() or {}
    try:
        c = DossierRevisionService.editer_commentaire(
            commentaire_id, g.current_user_id, data.get('contenu', ''),
        )
        db.session.commit()
        return success_response({'id': c.id, 'edited_at': c.edited_at.isoformat() if c.edited_at else None})
    except PermissionError as e:
        return error_response(str(e), 403)
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>/evenements', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_evenements(entite_id):
    """Liste l'audit trail d'un dossier (tous types d'evenements).
    Filtres : ?type=xxx, ?limit=N (defaut 100, max 500)
    """
    from app.models import DossierEvenement

    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    type_filter = request.args.get('type')
    limit = min(int(request.args.get('limit', 100)), 500)

    q = DossierEvenement.query.filter_by(entite_id=entite_id)
    if type_filter:
        q = q.filter_by(evenement_type=type_filter)
    events = q.order_by(DossierEvenement.createdAt.desc()).limit(limit).all()

    return success_response({
        'items': [{
            'id': e.id,
            'evenement_type': e.evenement_type,
            'acteur_user_id': e.acteur_user_id,
            'acteur_compte_id': e.acteur_compte_id,
            'acteur_role': e.acteur_role,
            'acteur_nom': (
                f"{e.acteur_user.prenom or ''} {e.acteur_user.nom or ''}".strip()
                if e.acteur_user else
                (e.acteur_compte.denomination if e.acteur_compte else 'Système')
            ),
            'payload': e.payload,
            'createdAt': e.createdAt.isoformat() if e.createdAt else None,
        } for e in events],
    })


@admin_bp.route('/commentaires/<string:commentaire_id>/resoudre', methods=['POST'])
@role_required('super_admin', 'admin', 'editor')
def resoudre_commentaire(commentaire_id):
    """Marque un commentaire comme resolu (action AGENT uniquement)."""
    from app.extensions import db
    from app.models import CommentaireDossier
    from app.services.dossier_revision_service import DossierRevisionService

    c = CommentaireDossier.query.get(commentaire_id)
    if not c:
        return error_response("Commentaire introuvable.", 404)

    # Editor : uniquement sur ses dossiers assignes
    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=c.entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    try:
        DossierRevisionService.resoudre_commentaire(commentaire_id, g.current_user_id)
        db.session.commit()
        return success_response({'id': commentaire_id, 'etat': 'resolved'})
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route('/entites/<string:entite_id>/revisions', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def list_revisions(entite_id):
    """Liste les revisions d'un dossier (modele PR)."""
    from app.services.dossier_revision_service import DossierRevisionService

    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    revs = DossierRevisionService.lister_revisions(entite_id)
    return success_response({
        'items': [{
            'id': r.id,
            'numero_revision': r.numero_revision,
            'soumis_le': r.soumis_le.isoformat() if r.soumis_le else None,
            'soumis_par_compte_id': r.soumis_par_compte_id,
            'statut_au_moment': r.statut_au_moment,
            'score_automatique_snapshot': r.score_automatique_snapshot,
        } for r in revs],
    })


@admin_bp.route('/entites/<string:entite_id>/revisions/diff', methods=['GET'])
@role_required('super_admin', 'admin', 'editor', 'reader')
def diff_revisions(entite_id):
    """Diff entre deux revisions : ?from=N&to=M.
    Param ?detail=true : diff semantique champ par champ avec valeurs avant/apres.
    Sinon : diff simple par rubrique (statut modifiee/inchangee/...).
    """
    from app.services.dossier_revision_service import DossierRevisionService
    from app.models import DossierRevision

    if g.current_user_role == 'editor':
        from app.models import AssignationDemande
        assigned = AssignationDemande.query.filter_by(
            agent_id=g.current_user_id, entite_id=entite_id,
        ).first()
        if not assigned:
            return error_response("Vous n'avez pas accès à cette entité.", 403)

    n_from = request.args.get('from', type=int)
    n_to = request.args.get('to', type=int)
    detail = request.args.get('detail', '').lower() == 'true'
    if not n_from or not n_to:
        return error_response("Parametres 'from' et 'to' requis (numeros de revision).", 400)
    rev_a = DossierRevision.query.filter_by(
        entite_id=entite_id, numero_revision=n_from
    ).first()
    rev_b = DossierRevision.query.filter_by(
        entite_id=entite_id, numero_revision=n_to
    ).first()
    if not rev_a or not rev_b:
        return error_response("Revision introuvable.", 404)

    if detail:
        result = DossierRevisionService.diff_revisions_detail(rev_a, rev_b)
        return success_response({
            'from': n_from, 'to': n_to,
            **result,
        })

    diff = DossierRevisionService.diff_revisions(rev_a, rev_b)
    return success_response({
        'from': n_from, 'to': n_to,
        'rubriques': diff,
    })


# --- Signalements d'erreur entreprise (Super Admin uniquement) ---

@admin_bp.route('/signalements', methods=['GET'])
@role_required('super_admin')
def list_signalements():
    """Liste tous les signalements d'erreur emis par les entreprises."""
    from app.models import SignalementErreur, EntiteBase
    statut = request.args.get('statut')  # open/in_progress/resolved/dismissed
    query = (
        SignalementErreur.query
        .join(EntiteBase, EntiteBase.id == SignalementErreur.entite_id)
    )
    if statut:
        query = query.filter(SignalementErreur.statut == statut)
    query = query.order_by(SignalementErreur.createdAt.desc())
    items = []
    for s in query.all():
        items.append({
            'id': s.id,
            'entite_id': s.entite_id,
            'entite_denomination': s.entite.denomination if s.entite else None,
            'compte_id': s.compte_id,
            'sujet': s.sujet,
            'description': s.description,
            'rubrique_concernee': s.rubrique_concernee,
            'statut': s.statut,
            'reponse_admin': s.reponse_admin,
            'traite_par': s.traite_par,
            'date_traitement': s.date_traitement.isoformat() if s.date_traitement else None,
            'createdAt': s.createdAt.isoformat() if s.createdAt else None,
        })
    return success_response({'items': items, 'total': len(items)})


@admin_bp.route('/signalements/<string:signalement_id>', methods=['PUT'])
@role_required('super_admin')
def repondre_signalement(signalement_id):
    """Mettre a jour le statut d'un signalement et apporter une reponse."""
    from datetime import datetime, timezone
    from app.extensions import db
    from app.models import SignalementErreur
    data = request.get_json() or {}
    statut = data.get('statut')
    if statut not in ('open', 'in_progress', 'resolved', 'dismissed'):
        return error_response('Statut invalide.', 400)
    signalement = SignalementErreur.query.get(signalement_id)
    if not signalement:
        return error_response('Signalement introuvable.', 404)
    signalement.statut = statut
    signalement.traite_par = g.current_user_id
    if 'reponse_admin' in data:
        signalement.reponse_admin = data['reponse_admin']
    if statut in ('resolved', 'dismissed'):
        signalement.date_traitement = datetime.now(timezone.utc)
    db.session.commit()
    return success_response(
        {'id': signalement.id, 'statut': signalement.statut},
        'Signalement mis a jour.'
    )
