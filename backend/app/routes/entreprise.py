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
        return success_response({'reponses': {}, 'entite_id': None, 'version': 0})
    form = FormulaireDCP.query.get(entite.id)
    return success_response({
        'entite_id': entite.id,
        'reponses': form.reponses if form else {},
        # Version pour verrouillage optimiste cote client (manœuvre B)
        'version': form.version if form else 0,
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

    # Propager la localisation (lat/lng) du pointage carte vers EntiteLocalisation
    # pour qu'elle apparaisse sur la carte publique apres publication.
    loc = (reponses.get('identification') or {}).get('localisation') or {}
    if isinstance(loc, dict):
        from app.models import EntiteLocalisation
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

    # Verrouillage optimiste (manœuvre B) : si le client a envoye une version
    # connue, on verifie qu'elle correspond a la version courante. Si elle est
    # obsolete, on rejette pour eviter d'ecraser le travail concurrent du
    # Demandeur ou du Representant legal.
    expected_version = data.get('version')
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
    }, 'Formulaire sauvegarde.')


@entreprise_bp.route('/formulaire-dcp/soumettre', methods=['POST'])
@entreprise_auth_required
def soumettre_formulaire_dcp():
    """Soumettre definitivement le formulaire DCP a l'ARTCI.

    Modele PR (cf. MODELE §3) :
    - chaque (re-)soumission produit une revision figee dans dossier_revisions
    - le numero_revision s'incremente (1ere soumission = #1, re-soumission = #2, ...)
    - cela permet aux agents de comparer les snapshots entre cycles
    """
    from app.extensions import db
    from app.models import EntiteBase, EntiteWorkflow, FormulaireDCP
    from app.models.enums import StatutWorkflowEnum
    from app.services.dossier_revision_service import DossierRevisionService
    from datetime import datetime, timezone

    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return error_response('Aucun dossier a soumettre.', 404)
    workflow = EntiteWorkflow.query.get(entite.id)
    if not workflow:
        return error_response('Workflow introuvable.', 404)
    if workflow.statut not in (StatutWorkflowEnum.brouillon, StatutWorkflowEnum.en_attente_complements):
        return error_response('Le dossier ne peut etre soumis dans son etat actuel.', 400)

    # Snapshot revision : on capture les reponses actuelles. Le score
    # automatique sera calcule par l'agent au moment du traitement (cf.
    # TraitementService.get_or_create_traitement) -- pas besoin a la soumission.
    form = FormulaireDCP.query.get(entite.id)
    reponses = (form.reponses if form else None) or {}

    # Garde-fou L1 (orientation #1) : pas de cycle vide possible. Avant la
    # re-soumission, chaque commentaire ARTCI open doit etre :
    #  - soit accompagne d'une modification de la rubrique commentee,
    #  - soit accompagne d'une reponse explicite (thread).
    # Sinon : blocage avec message clair listant les rubriques bloquantes.
    bloquants = DossierRevisionService.commentaires_bloquant_resoumission(
        entite.id, reponses,
    )
    if bloquants:
        rubriques_bloquantes = sorted(set(c.rubrique for c in bloquants))
        return error_response(
            f"Vous avez {len(bloquants)} commentaire(s) ARTCI non traité(s). "
            "Modifiez les rubriques concernées ou répondez explicitement aux commentaires "
            "avant de re-soumettre. Rubriques bloquantes : "
            + ", ".join(rubriques_bloquantes),
            400,
        )

    DossierRevisionService.snapshot_revision(
        entite=entite,
        reponses=reponses,
        soumis_par_compte_id=g.current_user_id,
        score_auto=None,
    )

    # MODELE PR §6.7 : auto-depublication si le dossier etait publie et qu'une
    # re-soumission fait potentiellement basculer le score sous le seuil.
    # On declenche un recalcul + applique_score_final, qui depubliera si necessaire
    # et notifiera l'entreprise.
    if entite.publie_sur_carte:
        from app.services.scoring_service import ScoringService
        try:
            score_recalc, _ = ScoringService.compute_score_only(entite)
            DossierRevisionService.appliquer_score_final(
                entite_id=entite.id,
                score=score_recalc,
            )
        except Exception:
            # On ne bloque pas la soumission si le recalcul echoue : l'agent
            # pourra toujours appliquer le score manuel au prochain traitement.
            pass

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


@entreprise_bp.route('/mes-documents', methods=['GET'])
@entreprise_auth_required
def get_mes_documents():
    """Liste de tous les fichiers deposes (inscription + enregistrement)."""
    result = EntrepriseService.get_tous_documents(g.current_user_id)
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


# --- Commentaires ancres (Modele PR) - lecture + reponse entreprise ---

@entreprise_bp.route('/commentaires', methods=['GET'])
@entreprise_auth_required
def list_mes_commentaires():
    """Liste les commentaires ancres sur le dossier de l'entreprise.
    Filtre optionnel : ?etat=open|resolved
    Affichage groupe par rubrique pour rendu contextuel cote front.
    """
    from app.models import EntiteBase
    from app.services.dossier_revision_service import DossierRevisionService
    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return success_response({'rubriques': {}, 'total_open': 0})
    etat = request.args.get('etat')
    groupes = DossierRevisionService.commentaires_groupes_par_rubrique(
        entite.id, etat=etat,
    )
    rubriques_out = {}
    total_open = 0
    for rub, commentaires in groupes.items():
        rubriques_out[rub] = []
        for c in commentaires:
            if c.etat == 'open':
                total_open += 1
            rubriques_out[rub].append({
                'id': c.id,
                'sous_question': c.sous_question,
                'contenu': c.contenu,
                'etat': c.etat,
                'reponse_entreprise': c.reponse_entreprise,
                'repondu_le': c.repondu_le.isoformat() if c.repondu_le else None,
                'cree_le': c.cree_le.isoformat() if c.cree_le else None,
                'agent_nom': (
                    f"{c.agent.prenom or ''} {c.agent.nom or ''}".strip()
                    if c.agent else None
                ),
            })
    return success_response({
        'rubriques': rubriques_out,
        'total_open': total_open,
    })


@entreprise_bp.route('/commentaires/<string:commentaire_id>/repondre', methods=['POST'])
@entreprise_auth_required
def repondre_commentaire(commentaire_id):
    """L'entreprise repond a un commentaire (sans le resoudre - seul l'agent peut)."""
    from app.extensions import db
    from app.services.dossier_revision_service import DossierRevisionService
    data = request.get_json() or {}
    reponse = (data.get('reponse') or '').strip()
    if not reponse:
        return error_response("La reponse ne peut pas etre vide.", 400)
    try:
        DossierRevisionService.repondre_commentaire(
            commentaire_id, reponse, g.current_user_id,
        )
        db.session.commit()
        return success_response({'id': commentaire_id, 'repondu': True})
    except PermissionError as e:
        return error_response(str(e), 403)
    except ValueError as e:
        return error_response(str(e), 404)


# --- Signalement d'erreur entreprise -> Super Admin ---

@entreprise_bp.route('/signalements', methods=['GET'])
@entreprise_auth_required
def list_mes_signalements():
    """Liste les signalements emis par l'entreprise courante."""
    from app.models import EntiteBase, SignalementErreur
    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return success_response({'items': []})
    signalements = (
        SignalementErreur.query
        .filter_by(entite_id=entite.id)
        .order_by(SignalementErreur.createdAt.desc())
        .all()
    )
    items = [{
        'id': s.id,
        'sujet': s.sujet,
        'description': s.description,
        'rubrique_concernee': s.rubrique_concernee,
        'statut': s.statut,
        'reponse_admin': s.reponse_admin,
        'createdAt': s.createdAt.isoformat() if s.createdAt else None,
        'date_traitement': s.date_traitement.isoformat() if s.date_traitement else None,
    } for s in signalements]
    return success_response({'items': items})


@entreprise_bp.route('/signalements', methods=['POST'])
@entreprise_auth_required
def creer_signalement():
    """Creer un signalement d'erreur sur sa fiche/dossier."""
    from app.extensions import db
    from app.models import EntiteBase, SignalementErreur
    data = request.get_json() or {}
    sujet = (data.get('sujet') or '').strip()
    description = (data.get('description') or '').strip()
    if not sujet or not description:
        return error_response('Sujet et description sont obligatoires.', 400)
    entite = EntiteBase.query.filter_by(compte_entreprise_id=g.current_user_id).first()
    if not entite:
        return error_response('Aucun dossier rattache a votre compte.', 404)
    signalement = SignalementErreur(
        entite_id=entite.id,
        compte_id=g.current_user_id,
        sujet=sujet[:255],
        description=description,
        rubrique_concernee=(data.get('rubrique_concernee') or '')[:120] or None,
    )
    db.session.add(signalement)
    db.session.commit()
    return created_response(
        {'id': signalement.id, 'statut': signalement.statut},
        'Signalement transmis aux Super Administrateurs.'
    )
