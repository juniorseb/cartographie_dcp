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
        """
        entite = EntiteBase.query.filter_by(compte_entreprise_id=compte_id).first()

        if not entite:
            return {
                'etape_courante': 1,
                'statut_workflow': None,
                'statut_conformite': None,
                'peut_soumettre': True,
                'peut_rapporter': False,
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

        # Déterminer l'étape courante
        if statut in ('brouillon', 'soumis'):
            etape = 1
        elif statut in ('en_verification', 'en_attente_complements', 'conforme_sous_reserve'):
            etape = 2
        else:  # conforme, valide, publie, rejete
            etape = 3

        # Peut rapporter seulement si Conforme
        peut_rapporter = statut_conf == 'Conforme'

        # Compter les feedbacks
        feedbacks_count = FeedbackVerification.query.filter_by(
            entite_id=entite.id
        ).count()

        return {
            'etape_courante': etape,
            'statut_workflow': statut,
            'statut_conformite': statut_conf,
            'peut_soumettre': statut in ('brouillon',),
            'peut_rapporter': peut_rapporter,
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

    # --- Rapprochements ---

    @staticmethod
    def get_rapprochements(compte_id):
        """Liste des demandes de rapprochement du compte."""
        from app.models import DemandeRapprochement
        rapprochements = DemandeRapprochement.query.filter_by(
            compte_entreprise_id=compte_id
        ).order_by(DemandeRapprochement.createdAt.desc()).all()
        return [
            {
                'id': r.id,
                'numero_cc': r.numero_cc,
                'raison': r.raison_demande,
                'statut': r.statut.value,
                'createdAt': r.createdAt.isoformat() if r.createdAt else None,
                'commentaire_admin': r.commentaire_artci,
            }
            for r in rapprochements
        ]

    @staticmethod
    def create_rapprochement(compte_id, numero_cc, raison, file=None):
        """Créer une demande de rapprochement."""
        from app.models import DemandeRapprochement, EntiteBase, CompteEntreprise
        from app.models.enums import StatutRapprochementEnum

        # Vérifier que l'entité avec ce CC existe
        entite = EntiteBase.query.filter_by(numero_cc=numero_cc).first()
        if not entite:
            raise ValueError(f'Aucune entité trouvée avec le N° CC {numero_cc}.')

        # Récupérer le compte pour l'email
        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte entreprise non trouvé.')

        # Sauvegarder le fichier si fourni
        doc_path = None
        if file and file.filename:
            import os
            upload_dir = os.path.join('uploads', 'rapprochements')
            os.makedirs(upload_dir, exist_ok=True)
            filename = f"{compte_id}_{file.filename}"
            filepath = os.path.join(upload_dir, filename)
            file.save(filepath)
            doc_path = filepath

        rapprochement = DemandeRapprochement(
            entite_id=entite.id,
            compte_entreprise_id=compte_id,
            email_demandeur=compte.email,
            numero_cc=numero_cc,
            raison_demande=raison,
            document_preuve_path=doc_path,
            statut=StatutRapprochementEnum.en_attente,
        )
        db.session.add(rapprochement)
        db.session.commit()

        return {
            'id': rapprochement.id,
            'numero_cc': rapprochement.numero_cc,
            'raison': rapprochement.raison_demande,
            'statut': rapprochement.statut.value,
            'createdAt': rapprochement.createdAt.isoformat() if rapprochement.createdAt else None,
        }
