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
                    {'step': 1, 'label': 'Demande', 'statut': 'active', 'description': 'Remplir et soumettre le formulaire'},
                    {'step': 2, 'label': 'Vérification', 'statut': 'pending', 'description': 'Examen par l\'ARTCI'},
                    {'step': 3, 'label': 'Décision', 'statut': 'pending', 'description': 'Validation ou rejet'},
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

        # Déterminer l'étape courante
        if statut in ('brouillon', 'soumis'):
            etape = 1
        elif statut in ('en_verification', 'en_attente_complements', 'conforme_sous_reserve'):
            etape = 2
        else:  # conforme, valide, publie, rejete
            etape = 3

        # Construire les steps pour le stepper
        def step_statut(step_num):
            if step_num < etape:
                return 'completed'
            elif step_num == etape:
                return 'active'
            return 'pending'

        steps = [
            {'step': 1, 'label': 'Demande', 'statut': step_statut(1), 'description': 'Remplir et soumettre le formulaire'},
            {'step': 2, 'label': 'Vérification', 'statut': step_statut(2), 'description': 'Examen par l\'ARTCI'},
            {'step': 3, 'label': 'Décision', 'statut': step_statut(3), 'description': 'Validation ou rejet'},
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
        """Historique des changements de statut (journal d'evenements)."""
        from app.models import HistoriqueStatut
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()
        if not entite:
            return []
        events = (
            HistoriqueStatut.query.filter_by(entite_id=entite.id)
            .order_by(HistoriqueStatut.date_changement.desc())
            .all()
        )
        result = []
        for e in events:
            modifie_par_nom = ''
            if e.modifie_par_user:
                modifie_par_nom = f"{e.modifie_par_user.prenom} {e.modifie_par_user.nom}".strip()
            result.append({
                'id': e.id,
                'ancien_statut': e.ancien_statut,
                'nouveau_statut': e.nouveau_statut,
                'commentaire': e.commentaire,
                'modifie_par_nom': modifie_par_nom,
                'date': e.date_changement.isoformat() if e.date_changement else None,
            })
        return result

