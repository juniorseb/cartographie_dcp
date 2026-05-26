"""
Service pour le portail entreprise ARTCI DCP.
Dashboard, demande, feedbacks, rapports, renouvellement, profil.
"""
from datetime import datetime, timezone
from app.extensions import db
from app.models import (
    EntiteBase, EntiteWorkflow, EntiteConformite,
    FeedbackVerification, Renouvellement, DocumentJoint
)
from app.models.enums import (
    StatutWorkflowEnum, StatutConformiteEnum,
    StatutRenouvellementEnum, TypeDocumentEnum
)
from app.schemas.entite import EntiteDetailOutputSchema
from app.schemas.auth import CompteEntrepriseOutputSchema
from app.schemas.workflow import FeedbackOutputSchema
from app.services.entite_service import EntiteService
from app.services.workflow_service import WorkflowService
from app.models.comptes_entreprises import CompteEntreprise


class EntrepriseService:

    @staticmethod
    def get_dashboard(compte_id):
        """
        Dashboard entreprise avec workflow 3 étapes.
        Retourne la structure attendue par le frontend DashboardData.
        """
        compte = CompteEntreprise.query.get(compte_id)
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()

        compte_info = {
            'denomination': compte.denomination if compte else '',
            'numero_cc': compte.numero_cc if compte else '',
            'email': compte.email if compte else '',
        }

        if not entite:
            return {
                'compte': compte_info,
                'entite_id': None,
                'statut_workflow': None,
                'statut_conformite': None,
                'score_conformite': None,
                'steps': [
                    {'step': 1, 'label': 'Enregistrement', 'statut': 'active', 'description': 'Remplir et soumettre le formulaire'},
                    {'step': 2, 'label': 'Vérification', 'statut': 'pending', 'description': 'Examen par l\'ARTCI'},
                    {'step': 3, 'label': 'Publication', 'statut': 'pending', 'description': 'Mise en ligne sur la carte'},
                ],
                'has_demande': False,
                'can_edit': True,
                'can_submit': True,
                'feedbacks_non_lus': 0,
            }

        workflow = EntiteWorkflow.query.get(entite.id)
        conformite = EntiteConformite.query.get(entite.id)

        statut = workflow.statut.value if workflow else 'brouillon'
        statut_conf = (
            conformite.statut_conformite.value
            if conformite and conformite.statut_conformite
            else None
        )
        score = conformite.score_conformite if conformite else None

        # Déterminer l'étape courante (3 etapes : Enregistrement / Vérification / Publication)
        # - brouillon                 : en train de remplir le formulaire (etape 1)
        # - soumis / verif / attente  : ARTCI examine (etape 2)
        # - valide / conforme_sous_r. : pret a publier ou publication en cours (etape 3)
        # - publie                    : entite visible sur la carte -> tout complet
        # - rejete                    : workflow termine sur un rejet (etape 3 marquee active)
        if statut == 'brouillon':
            etape = 1
        elif statut in ('soumis', 'en_verification', 'en_attente_complements'):
            etape = 2
        else:  # conforme_sous_reserve, valide, publie, rejete
            etape = 3

        # Si publie : tous les steps completes (stepper full green).
        all_completed = statut == 'publie'

        def step_statut(step_num):
            if all_completed:
                return 'completed'
            if step_num < etape:
                return 'completed'
            if step_num == etape:
                return 'active'
            return 'pending'

        steps = [
            {'step': 1, 'label': 'Enregistrement', 'statut': step_statut(1), 'description': 'Remplir et soumettre le formulaire'},
            {'step': 2, 'label': 'Vérification', 'statut': step_statut(2), 'description': 'Examen par l\'ARTCI'},
            {'step': 3, 'label': 'Publication', 'statut': step_statut(3), 'description': 'Mise en ligne sur la carte'},
        ]

        # Compter les feedbacks
        feedbacks_count = FeedbackVerification.query.filter_by(
            entite_id=entite.id
        ).count()

        can_edit = statut in ('brouillon', 'en_attente_complements', 'rejete')

        return {
            'compte': compte_info,
            'entite_id': entite.id,
            'statut_workflow': statut,
            'statut_conformite': statut_conf,
            'score_conformite': score,
            'steps': steps,
            'has_demande': True,
            'can_edit': can_edit,
            'can_submit': statut in ('brouillon',),
            'feedbacks_non_lus': feedbacks_count,
        }

    @staticmethod
    def get_mon_dossier(compte_id):
        """
        Récupérer le dossier complet de l'entreprise.
        """
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            return None

        entite = EntiteService.get_entite_with_eager_load(entite.id)
        return EntiteDetailOutputSchema().dump(entite)

    @staticmethod
    def create_demande(compte_id, data):
        """
        Créer une nouvelle demande (formulaire 50 questions).
        """
        # Vérifier qu'il n'y a pas de demande active
        existing = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if existing:
            raise ValueError('Vous avez déjà une demande en cours.')

        return EntiteService.create_entite_with_children(
            data,
            compte_id=compte_id,
            origine='auto_recensement'
        )

    @staticmethod
    def update_demande(compte_id, entite_id, data):
        """
        Modifier une demande (brouillon seulement).
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Demande non trouvée.')

        if entite.compte_entreprise_id != compte_id:
            raise ValueError('Cette demande ne vous appartient pas.')

        workflow = EntiteWorkflow.query.get(entite_id)
        if not workflow or workflow.statut != StatutWorkflowEnum.brouillon:
            raise ValueError('Seules les demandes en brouillon peuvent être modifiées.')

        return EntiteService.update_entite_with_children(entite, data)

    @staticmethod
    def soumettre_demande(compte_id, entite_id):
        """
        Soumettre une demande (brouillon -> soumis).
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Demande non trouvée.')

        if entite.compte_entreprise_id != compte_id:
            raise ValueError('Cette demande ne vous appartient pas.')

        WorkflowService.transition_statut(entite_id, 'soumis', None, 'Demande soumise par l\'entreprise')

    @staticmethod
    def get_feedbacks(compte_id):
        """
        Récupérer les feedbacks ARTCI pour l'entreprise.
        """
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            return []

        feedbacks = FeedbackVerification.query.filter_by(
            entite_id=entite.id
        ).order_by(FeedbackVerification.date_feedback.desc()).all()

        return FeedbackOutputSchema(many=True).dump(feedbacks)

    @staticmethod
    def soumettre_rapport(compte_id, file, type_document='rapport_activite'):
        """
        Soumettre un rapport d'activité (réservé aux conformes).
        """
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            raise ValueError('Aucune entité trouvée.')

        conformite = EntiteConformite.query.get(entite.id)
        if not conformite or conformite.statut_conformite != StatutConformiteEnum.conforme:
            raise ValueError('Les rapports sont disponibles uniquement pour les entités conformes.')

        # Sauvegarder le fichier
        import os
        from flask import current_app
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, file.filename)
        file.save(filepath)

        doc = DocumentJoint(
            entite_id=entite.id,
            type_document=TypeDocumentEnum(type_document),
            nom_fichier=file.filename,
            chemin_fichier=filepath,
            taille=os.path.getsize(filepath),
            mime_type=file.content_type
        )
        db.session.add(doc)
        db.session.commit()
        return doc

    @staticmethod
    def demander_renouvellement(compte_id, data):
        """
        Demander un renouvellement (réservé aux conformes).
        """
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            raise ValueError('Aucune entité trouvée.')

        conformite = EntiteConformite.query.get(entite.id)
        if not conformite or conformite.statut_conformite != StatutConformiteEnum.conforme:
            raise ValueError('Le renouvellement est disponible uniquement pour les entités conformes.')

        renouvellement = Renouvellement(
            entite_id=entite.id,
            date_expiration_agrement=data.get('date_expiration_agrement'),
            motif=data.get('motif'),
            statut=StatutRenouvellementEnum.en_attente
        )
        db.session.add(renouvellement)
        db.session.commit()
        return renouvellement

    @staticmethod
    def get_profil(compte_id):
        """Récupérer le profil entreprise."""
        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            return None
        return CompteEntrepriseOutputSchema().dump(compte)

    @staticmethod
    def update_profil(compte_id, data):
        """Modifier le profil entreprise (champs non sensibles)."""
        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte non trouvé.')

        updatable = ['denomination', 'telephone', 'adresse', 'ville', 'region']
        for field in updatable:
            if field in data:
                setattr(compte, field, data[field])

        db.session.commit()
        return CompteEntrepriseOutputSchema().dump(compte)

    # ----- Mon dossier : sous-onglets -----

    DPO_DOC_TYPES = {
        TypeDocumentEnum.dpo_cv,
        TypeDocumentEnum.dpo_casier_judiciaire,
        TypeDocumentEnum.dpo_cni,
        TypeDocumentEnum.dpo_extrait_naissance,
    }

    @staticmethod
    def list_documents(compte_id, types=None):
        """Liste les documents joints de l'entite, filtres par types optionnels."""
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            return []
        query = DocumentJoint.query.filter_by(entite_id=entite.id)
        if types:
            query = query.filter(DocumentJoint.type_document.in_(types))
        docs = query.order_by(DocumentJoint.uploadedAt.desc()).all()
        return [
            {
                'id': d.id,
                'type_document': d.type_document.value,
                'nom_fichier': d.nom_fichier,
                'taille': d.taille,
                'mime_type': d.mime_type,
                'uploadedAt': d.uploadedAt.isoformat() if d.uploadedAt else None,
            }
            for d in docs
        ]

    @staticmethod
    def get_tous_documents(compte_id):
        """Liste l'ensemble des fichiers deposes par l'entreprise :
        - documents d'inscription (RCCM, DFE, autres) stockes sur R2 / compte
        - documents joints de l'entite (rapports, documents DPO, autorisation, etc.)

        Chaque entree contient un `download_url` signe (R2) si possible, sinon
        une URL backend de fallback pour les fichiers stockes en local.
        """
        from app.utils.r2_storage import generate_download_url

        resultat = []

        # 1) Documents d'inscription (stockes en JSONB sur le compte).
        # Les fichiers recents sont sur R2 (champ `r2_key`) — on genere une URL
        # signee valide 1h. Les anciens (champ `chemin_fichier` disque local)
        # restent telechargeables via l'ancien endpoint backend.
        compte = db.session.get(CompteEntreprise, compte_id)
        if compte and compte.documents_inscription:
            for i, d in enumerate(compte.documents_inscription):
                download_url = None
                r2_key = d.get('r2_key')
                if r2_key:
                    try:
                        download_url = generate_download_url(
                            r2_key, expires_in=3600, filename=d.get('nom_fichier'),
                        )
                    except Exception:
                        download_url = None
                resultat.append({
                    'id': f'inscription-{i}',
                    'source': 'inscription',
                    'type_document': d.get('type'),
                    'nom_fichier': d.get('nom_fichier'),
                    'taille': d.get('taille'),
                    'mime_type': d.get('mime_type'),
                    'uploadedAt': d.get('uploadedAt'),
                    'download_url': download_url,
                })

        # 2) Documents joints de l'entite (rapports d'audit, autorisations, etc.)
        for d in EntrepriseService.list_documents(compte_id):
            d['source'] = 'enregistrement'
            resultat.append(d)

        # 3) Documents du formulaire DCP — Charte, courrier DPO, registre violations,
        # procedure violation, autorisation transfert. Stockes en JSONB sur le
        # FormulaireDCP (champs *_doc avec {r2_key, filename, size, mime_type}).
        from app.models import EntiteBase, FormulaireDCP
        entites = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).all()
        # Chaque (path dans le JSONB, type_document logique)
        FORM_DOC_PATHS = [
            (['cadre_juridique', 'dpo_courrier_habilitation_doc'], 'courrier_habilitation_dpo'),
            (['securite', 'charte_doc'], 'charte_protection'),
            (['securite', 'registre_violations_doc'], 'registre_violations'),
            (['securite', 'procedures_violation_doc'], 'procedure_violation'),
            (['sous_traitance_transferts', 'autorisation_transfert_document_doc'], 'autorisation_transfert'),
        ]
        for entite in entites:
            formulaire = FormulaireDCP.query.get(entite.id)
            if not formulaire or not formulaire.reponses:
                continue
            reponses = formulaire.reponses
            for path, type_doc in FORM_DOC_PATHS:
                # Naviguer dans le JSONB
                current = reponses
                for key in path:
                    if not isinstance(current, dict):
                        current = None
                        break
                    current = current.get(key)
                if not isinstance(current, dict) or not current.get('r2_key'):
                    continue
                r2_key = current['r2_key']
                filename = current.get('filename')
                download_url = None
                try:
                    download_url = generate_download_url(
                        r2_key, expires_in=3600, filename=filename,
                    )
                except Exception:
                    pass
                resultat.append({
                    'id': f'form-{entite.id}-{type_doc}',
                    'source': 'enregistrement',
                    'type_document': type_doc,
                    'nom_fichier': filename,
                    'taille': current.get('size'),
                    'mime_type': current.get('mime_type'),
                    'uploadedAt': None,
                    'download_url': download_url,
                })

        return resultat

    @staticmethod
    def get_mes_rapports(compte_id):
        """Liste les rapports d'activite et rapports d'audit."""
        return EntrepriseService.list_documents(
            compte_id,
            types=[TypeDocumentEnum.rapport_activite, TypeDocumentEnum.rapport_audit],
        )

    @staticmethod
    def get_documents_dpo(compte_id):
        """Liste les 4 documents DPO."""
        return EntrepriseService.list_documents(
            compte_id, types=list(EntrepriseService.DPO_DOC_TYPES)
        )

    @staticmethod
    def upload_document_dpo(compte_id, file, type_document):
        """Upload d'un document DPO (CV, casier, CNI, extrait naissance).
        Si un document du meme type existe deja, il est remplace."""
        try:
            type_enum = TypeDocumentEnum(type_document)
        except ValueError:
            raise ValueError('Type de document inconnu.')
        if type_enum not in EntrepriseService.DPO_DOC_TYPES:
            raise ValueError('Ce type de document n\'est pas un document DPO.')

        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            raise ValueError('Aucune entite trouvee.')

        import os
        from flask import current_app
        upload_folder = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'dpo'
        )
        os.makedirs(upload_folder, exist_ok=True)
        filename = f"{entite.id}_{type_document}_{file.filename}"
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        # Remplacer le precedent document du meme type si existant
        existing = DocumentJoint.query.filter_by(
            entite_id=entite.id, type_document=type_enum
        ).first()
        if existing:
            try:
                if existing.chemin_fichier and os.path.exists(existing.chemin_fichier):
                    os.remove(existing.chemin_fichier)
            except OSError:
                pass
            existing.nom_fichier = file.filename
            existing.chemin_fichier = filepath
            existing.taille = os.path.getsize(filepath)
            existing.mime_type = file.content_type
            doc = existing
        else:
            doc = DocumentJoint(
                entite_id=entite.id,
                type_document=type_enum,
                nom_fichier=file.filename,
                chemin_fichier=filepath,
                taille=os.path.getsize(filepath),
                mime_type=file.content_type,
            )
            db.session.add(doc)
        db.session.commit()
        return doc

    @staticmethod
    def get_journal_evenements(compte_id):
        """Journal complet des evenements lies au dossier de l'entreprise (vue entreprise)."""
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            return []
        return EntrepriseService.get_journal_evenements_for_entite(
            entite.id, viewer='entreprise', signalement_compte_filter=compte_id,
        )

    @staticmethod
    def get_journal_evenements_for_entite(entite_id, viewer='admin', signalement_compte_filter=None):
        """Journal agrege des evenements pour une entite donnee.

        Spec E2 : « Prends en compte tous les evenements lies a l'enregistrement
        (ARTCI ou Entreprise lui meme (soumission...), signalements...) »

        Agrege :
        - HistoriqueStatut : transitions de workflow (soumis, en_verification, ...)
        - DossierEvenement : retours admin, validations N+1, depublications auto,
          scoring applique...
        - SignalementErreur : signalements emis par l'entreprise

        Args:
            entite_id : identifiant de l'entite
            viewer    : 'entreprise' ou 'admin' (impacte les libelles pour les retours)
            signalement_compte_filter : si fourni, ne renvoie que les signalements
                de ce compte (vue entreprise mono-utilisateur).
        """
        from app.models import HistoriqueStatut, DossierEvenement, SignalementErreur

        result = []

        # 1) Historique des transitions de statut (workflow)
        for e in HistoriqueStatut.query.filter_by(entite_id=entite_id).all():
            modifie_par_nom = ''
            if e.modifie_par_user:
                modifie_par_nom = f"{e.modifie_par_user.prenom} {e.modifie_par_user.nom}".strip()
            result.append({
                'id': f'hist-{e.id}',
                'source': 'historique_statut',
                'ancien_statut': e.ancien_statut,
                'nouveau_statut': e.nouveau_statut,
                'commentaire': e.commentaire,
                'modifie_par_nom': modifie_par_nom,
                'date': e.date_changement.isoformat() if e.date_changement else None,
            })

        # 2) Evenements riches du dossier (retours admin, validations, etc.)
        if viewer == 'entreprise':
            TYPES_LISIBLES = {
                'retour_entreprise': 'Dossier retourné à votre entreprise',
                'validation_n_plus_1': 'Validation finale (N+1) effectuée',
                'score_applique': 'Nouveau score appliqué',
                're_soumission_recalc': 'Re-soumission — score recalculé',
                'depublication_auto': 'Fiche retirée automatiquement de la carte',
                'publication': 'Fiche publiée sur la cartographie',
            }
        else:
            TYPES_LISIBLES = {
                'retour_entreprise': 'Dossier retourné à l\'entreprise',
                'validation_n_plus_1': 'Validation N+1 effectuée',
                'score_applique': 'Nouveau score appliqué',
                're_soumission_recalc': 'Re-soumission — score recalculé',
                'depublication_auto': 'Fiche dépubliée automatiquement',
                'publication': 'Fiche publiée sur la cartographie',
            }
        for ev in DossierEvenement.query.filter_by(entite_id=entite_id).all():
            label = TYPES_LISIBLES.get(ev.evenement_type) or ev.evenement_type.replace('_', ' ').capitalize()
            payload = ev.payload or {}
            commentaire_parts = []
            if isinstance(payload, dict):
                if payload.get('motif'):
                    commentaire_parts.append(f"Motif : {payload['motif']}")
                if payload.get('score_apres') is not None:
                    commentaire_parts.append(f"Score après : {payload['score_apres']}/100")
                if payload.get('score_final') is not None:
                    commentaire_parts.append(f"Score final : {payload['score_final']}/100")
                if payload.get('decision'):
                    commentaire_parts.append(f"Décision : {payload['decision']}")
            result.append({
                'id': f'event-{ev.id}',
                'source': 'evenement_dossier',
                'ancien_statut': None,
                'nouveau_statut': label,  # label lisible (pas le code brut)
                'commentaire': ' • '.join(commentaire_parts) if commentaire_parts else None,
                'modifie_par_nom': ev.acteur_role.capitalize() if ev.acteur_role else 'ARTCI',
                'date': ev.createdAt.isoformat() if ev.createdAt else None,
            })

        # 3) Signalements emis par l'entreprise (etat actuel)
        STATUT_SIGNAL_LABELS = {
            'open': 'Signalement en attente',
            'in_progress': 'Signalement en cours de traitement',
            'resolved': 'Signalement résolu',
            'dismissed': 'Signalement clôturé',
        }
        sig_query = SignalementErreur.query.filter_by(entite_id=entite_id)
        if signalement_compte_filter:
            sig_query = sig_query.filter_by(compte_id=signalement_compte_filter)
        for s in sig_query.all():
            modifie_par_nom = 'Vous' if viewer == 'entreprise' else 'Entreprise'
            result.append({
                'id': f'signal-{s.id}',
                'source': 'signalement',
                'ancien_statut': None,
                'nouveau_statut': STATUT_SIGNAL_LABELS.get(s.statut, s.statut),
                'commentaire': f"« {s.sujet} » — {s.description[:150]}"
                + (' ...' if s.description and len(s.description) > 150 else ''),
                'modifie_par_nom': modifie_par_nom,
                'date': (
                    s.date_traitement.isoformat() if s.date_traitement
                    else s.createdAt.isoformat() if s.createdAt else None
                ),
            })

        # Tri chronologique inverse (le plus recent en premier)
        result.sort(key=lambda x: x['date'] or '', reverse=True)
        return result

