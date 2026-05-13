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


# --- Formulaire DCP officiel (questionnaire de recensement) ---

@entreprise_bp.route('/formulaire-dcp', methods=['GET'])
@entreprise_auth_required
def get_formulaire_dcp():
    """Recuperer les reponses au formulaire officiel DCP de l'entreprise."""
    from app.models import EntiteBase, FormulaireDCP
    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return success_response({'reponses': {}, 'entite_id': None})
    form = FormulaireDCP.query.get(entite.id)
    return success_response({
        'entite_id': entite.id,
        'reponses': form.reponses if form else {},
    })


@entreprise_bp.route('/formulaire-dcp', methods=['PUT'])
@entreprise_auth_required
def save_formulaire_dcp():
    """Sauvegarder (upsert) les reponses au formulaire officiel DCP."""
    from app.extensions import db
    from app.models import EntiteBase, FormulaireDCP, EntiteWorkflow
    from app.models.enums import OrigineSaisieEnum, StatutWorkflowEnum
    from app.models.comptes_entreprises import CompteEntreprise

    data = request.get_json() or {}
    reponses = data.get('reponses', {})
    if not isinstance(reponses, dict):
        return error_response('Les reponses doivent etre un objet.', 400)

    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        compte = CompteEntreprise.query.get(g.current_user_id)
        denomination = (
            (reponses.get('identification') or {}).get('denomination')
            or (compte.denomination if compte else 'Entreprise')
        )
        numero_cc = (
            (reponses.get('identification') or {}).get('numero_cc')
            or (compte.numero_cc if compte else None)
        )
        if not numero_cc:
            return error_response('Le numero CC est requis.', 400)
        entite = EntiteBase(
            compte_entreprise_id=g.current_user_id,
            denomination=denomination[:255],
            numero_cc=numero_cc[:50],
            origine_saisie=OrigineSaisieEnum.auto_recensement,
            publie_sur_carte=False,
        )
        db.session.add(entite)
        db.session.flush()
        wf = EntiteWorkflow(
            entite_id=entite.id,
            statut=StatutWorkflowEnum.brouillon,
            createdBy=None,
        )
        db.session.add(wf)

    # Calculer automatiquement le type de formalite (Autorisation vs Declaration)
    from app.services.formalite_engine import determiner_formalite
    formalite_type, motifs = determiner_formalite(reponses)
    cadre = reponses.get('cadre_juridique', {}) or {}
    cadre['formalite_calculee'] = formalite_type
    cadre['formalite_motifs'] = motifs
    reponses['cadre_juridique'] = cadre

    form = FormulaireDCP.query.get(entite.id)
    if not form:
        form = FormulaireDCP(entite_id=entite.id, reponses=reponses)
        db.session.add(form)
    else:
        form.reponses = reponses
    db.session.commit()
    return success_response({
        'entite_id': entite.id,
        'reponses': form.reponses,
        'formalite_calculee': formalite_type,
        'formalite_motifs': motifs,
    }, 'Formulaire sauvegarde.')


@entreprise_bp.route('/formulaire-dcp/soumettre', methods=['POST'])
@entreprise_auth_required
def soumettre_formulaire_dcp():
    """Soumettre definitivement le formulaire DCP a l'ARTCI."""
    from app.extensions import db
    from app.models import EntiteBase, EntiteWorkflow
    from app.models.enums import StatutWorkflowEnum
    from datetime import datetime, timezone
    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return error_response('Aucun dossier a soumettre.', 404)
    workflow = EntiteWorkflow.query.get(entite.id)
    if not workflow:
        return error_response('Workflow introuvable.', 404)
    if workflow.statut not in (StatutWorkflowEnum.brouillon, StatutWorkflowEnum.en_attente_complements):
        return error_response('Le dossier ne peut etre soumis dans son etat actuel.', 400)
    workflow.statut = StatutWorkflowEnum.soumis
    workflow.date_soumission = datetime.now(timezone.utc)
    db.session.commit()
    return success_response({'statut': workflow.statut.value}, 'Dossier soumis a l\'ARTCI.')


# --- Mon dossier : sous-onglets ---

@entreprise_bp.route('/mes-rapports', methods=['GET'])
@entreprise_auth_required
def get_mes_rapports():
    """Liste des rapports d'activite et d'audit deposes."""
    result = EntrepriseService.get_mes_rapports(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/journal-evenements', methods=['GET'])
@entreprise_auth_required
def get_journal_evenements():
    """Historique des changements de statut du dossier."""
    result = EntrepriseService.get_journal_evenements(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/dossier-dpo', methods=['GET'])
@entreprise_auth_required
def get_dossier_dpo():
    """Liste des 4 documents DPO (CV, casier, CNI, extrait naissance)."""
    result = EntrepriseService.get_documents_dpo(g.current_user_id)
    return success_response(result)


@entreprise_bp.route('/dossier-dpo', methods=['POST'])
@entreprise_auth_required
def upload_document_dpo():
    """Upload d'un document DPO (remplace le precedent du meme type)."""
    if 'file' not in request.files:
        return error_response('Aucun fichier fourni.', 400)
    file = request.files['file']
    if not file.filename:
        return error_response('Nom de fichier vide.', 400)
    type_document = request.form.get('type_document')
    if not type_document:
        return error_response('type_document requis (dpo_cv, dpo_casier_judiciaire, dpo_cni, dpo_extrait_naissance).', 400)
    try:
        doc = EntrepriseService.upload_document_dpo(
            g.current_user_id, file, type_document
        )
        return created_response(
            {'id': doc.id, 'type_document': doc.type_document.value, 'nom_fichier': doc.nom_fichier},
            'Document deposé.'
        )
    except ValueError as e:
        return error_response(str(e), 400)
