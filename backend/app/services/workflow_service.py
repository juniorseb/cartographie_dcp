"""
Service de workflow pour ARTCI DCP Platform.
Machine à états, assignation de demandes, validation N+1.
"""
from datetime import datetime, timezone, date
from app.extensions import db
from app.models import (
    EntiteBase, EntiteWorkflow, EntiteConformite,
    AssignationDemande, HistoriqueStatut
)
from app.models.enums import (
    StatutWorkflowEnum, StatutConformiteEnum, StatutAssignationEnum
)

# Machine à états : transitions autorisées
ALLOWED_TRANSITIONS = {
    'brouillon': ['soumis'],
    'brouillon_artci': ['soumis'],
    'soumis': ['en_verification'],
    'en_verification': ['en_attente_complements', 'conforme', 'conforme_sous_reserve', 'rejete'],
    'en_attente_complements': ['soumis'],
    'conforme': ['valide'],
    'conforme_sous_reserve': ['valide', 'rejete'],
    'valide': ['publie'],
}

# Mapping workflow -> statut conformité
CONFORMITE_MAPPING = {
    'conforme': StatutConformiteEnum.conforme,
    'valide': StatutConformiteEnum.conforme,
    'publie': StatutConformiteEnum.conforme,
    'conforme_sous_reserve': StatutConformiteEnum.demarche_achevee,
    'soumis': StatutConformiteEnum.demarche_en_cours,
    'en_verification': StatutConformiteEnum.demarche_en_cours,
    'en_attente_complements': StatutConformiteEnum.demarche_en_cours,
}


class WorkflowService:

    @staticmethod
    def transition_statut(entite_id, new_statut_str, user_id, commentaire=None):
        """
        Effectuer une transition de statut sur une entité.
        Valide la transition, met à jour workflow + conformité, crée l'historique.
        """
        workflow = EntiteWorkflow.query.get(entite_id)
        if not workflow:
            raise ValueError('Entité non trouvée.')

        current = workflow.statut.value
        allowed = ALLOWED_TRANSITIONS.get(current, [])

        if new_statut_str not in allowed:
            raise ValueError(
                f'Transition non autorisée : {current} -> {new_statut_str}. '
                f'Transitions possibles : {allowed}'
            )

        ancien_statut = current
        new_statut = StatutWorkflowEnum(new_statut_str)
        workflow.statut = new_statut

        # Mettre à jour les dates selon la transition
        now = datetime.now(timezone.utc)
        if new_statut_str == 'soumis':
            workflow.date_soumission = now
        elif new_statut_str in ('conforme', 'conforme_sous_reserve', 'valide'):
            workflow.date_validation = now
        elif new_statut_str == 'rejete':
            workflow.date_rejet = now
            if commentaire:
                workflow.motif_rejet = commentaire
        elif new_statut_str == 'publie':
            workflow.date_publication = now
            # Publier sur la carte
            entite = EntiteBase.query.get(entite_id)
            if entite:
                entite.publie_sur_carte = True

        # Mettre à jour le statut de conformité
        if new_statut_str in CONFORMITE_MAPPING:
            conformite = EntiteConformite.query.get(entite_id)
            if conformite:
                conformite.statut_conformite = CONFORMITE_MAPPING[new_statut_str]

        # Créer l'entrée historique
        historique = HistoriqueStatut(
            entite_id=entite_id,
            ancien_statut=ancien_statut,
            nouveau_statut=new_statut_str,
            modifie_par=user_id,
            commentaire=commentaire
        )
        db.session.add(historique)
        db.session.commit()

    @staticmethod
    def assign_demande(entite_id, agent_id, echeance, assigned_by):
        """
        Assigner une demande à un agent.
        Transition : soumis -> en_verification.
        """
        workflow = EntiteWorkflow.query.get(entite_id)
        if not workflow:
            raise ValueError('Entité non trouvée.')

        if workflow.statut != StatutWorkflowEnum.soumis:
            raise ValueError('Seules les demandes soumises peuvent être assignées.')

        # Créer l'assignation
        assignation = AssignationDemande(
            entite_id=entite_id,
            agent_id=agent_id,
            echeance=echeance,
            statut=StatutAssignationEnum.en_cours
        )
        db.session.add(assignation)

        # Transition du workflow
        workflow.statut = StatutWorkflowEnum.en_verification
        workflow.assignedTo = agent_id

        # Historique
        historique = HistoriqueStatut(
            entite_id=entite_id,
            ancien_statut='soumis',
            nouveau_statut='en_verification',
            modifie_par=assigned_by,
            commentaire=f'Demande assignée à l\'agent {agent_id}'
        )
        db.session.add(historique)

        # Conformité -> Démarche en cours
        conformite = EntiteConformite.query.get(entite_id)
        if conformite:
            conformite.statut_conformite = StatutConformiteEnum.demarche_en_cours

        db.session.commit()
        return assignation

    @staticmethod
    def traiter_assignation(assignation_id, agent_id):
        """
        Agent marque sa demande comme traitée (en attente validation N+1).
        """
        assignation = AssignationDemande.query.get(assignation_id)
        if not assignation:
            raise ValueError('Assignation non trouvée.')

        if assignation.agent_id != agent_id:
            raise ValueError('Cette assignation n\'est pas la vôtre.')

        if assignation.statut not in (
            StatutAssignationEnum.en_cours,
            StatutAssignationEnum.en_retard
        ):
            raise ValueError('Cette assignation ne peut plus être traitée.')

        assignation.statut = StatutAssignationEnum.traite_attente_validation
        assignation.traite_le = datetime.now(timezone.utc)
        db.session.commit()
        return assignation

    @staticmethod
    def get_demandes_a_valider():
        """
        Récupérer les demandes en attente de validation N+1.
        """
        return AssignationDemande.query.filter_by(
            statut=StatutAssignationEnum.traite_attente_validation
        ).all()

    @staticmethod
    def valider_n1(assignation_id, validateur_id, action, commentaire=None):
        """
        Validation N+1 : valider ou renvoyer à l'agent.
        """
        assignation = AssignationDemande.query.get(assignation_id)
        if not assignation:
            raise ValueError('Assignation non trouvée.')

        if assignation.statut != StatutAssignationEnum.traite_attente_validation:
            raise ValueError('Cette demande n\'est pas en attente de validation.')

        now = datetime.now(timezone.utc)

        if action == 'valider':
            assignation.statut = StatutAssignationEnum.valide
            assignation.valide_par = validateur_id
            assignation.valide_le = now

            # Transition workflow selon le cas
            WorkflowService.transition_statut(
                assignation.entite_id, 'conforme', validateur_id, commentaire
            )

        elif action == 'renvoyer':
            assignation.statut = StatutAssignationEnum.en_cours
            assignation.traite_le = None

        db.session.commit()
        return assignation

    @staticmethod
    def check_echeances_depassees():
        """
        Marquer les assignations en retard (échéance dépassée).
        """
        today = date.today()
        overdue = AssignationDemande.query.filter(
            AssignationDemande.echeance < today,
            AssignationDemande.statut == StatutAssignationEnum.en_cours
        ).all()

        for assignation in overdue:
            assignation.statut = StatutAssignationEnum.en_retard

        if overdue:
            db.session.commit()

        return overdue
