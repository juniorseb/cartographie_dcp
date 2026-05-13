"""
Service workflow Traiter (spec §6 reunion 07/05/2026).
Gere le travail de l'editeur/admin sur un dossier soumis.
"""
from datetime import datetime, timezone
from app.extensions import db
from app.models import EntiteBase, EntiteWorkflow, EntiteConformite, TraitementDossier, FormulaireDCP
from app.models.enums import StatutWorkflowEnum
from app.services.scoring_service import ScoringService


class TraitementService:

    @staticmethod
    def get_or_create_traitement(entite_id, traitant_id):
        """Recupere ou cree le traitement courant pour cette entite."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entite non trouvee.')

        # Chercher un traitement en_cours pour cet agent
        traitement = TraitementDossier.query.filter_by(
            entite_id=entite_id, traitant_id=traitant_id,
        ).filter(TraitementDossier.statut.in_(['en_cours', 'soumis_validation'])).first()

        if not traitement:
            # Calculer le score automatique propose
            ScoringService.mettre_a_jour_score(entite)
            db.session.commit()
            db.session.refresh(entite)
            score_auto = entite.conformite.score_conformite if entite.conformite else 0
            traitement = TraitementDossier(
                entite_id=entite_id,
                traitant_id=traitant_id,
                commentaires_par_rubrique={},
                score_automatique=score_auto,
                score_manuel=score_auto,  # initialise au score auto
                niveau_conformite=ScoringService.classifier(score_auto).value,
                statut='en_cours',
            )
            db.session.add(traitement)
            db.session.commit()
        return traitement

    @staticmethod
    def serialize(traitement):
        """Serialise un traitement avec donnees completes du dossier."""
        entite = traitement.entite
        formulaire = FormulaireDCP.query.get(traitement.entite_id)
        return {
            'id': traitement.id,
            'entite_id': traitement.entite_id,
            'entite_denomination': entite.denomination if entite else None,
            'entite_numero_cc': entite.numero_cc if entite else None,
            'reponses_formulaire': formulaire.reponses if formulaire else {},
            'commentaires_par_rubrique': traitement.commentaires_par_rubrique or {},
            'score_automatique': traitement.score_automatique,
            'score_manuel': traitement.score_manuel,
            'niveau_conformite': traitement.niveau_conformite,
            'recommandations': traitement.recommandations,
            'statut': traitement.statut,
            'decision_validation': traitement.decision_validation,
            'motif_retour': traitement.motif_retour,
            'createdAt': traitement.createdAt.isoformat() if traitement.createdAt else None,
            'updatedAt': traitement.updatedAt.isoformat() if traitement.updatedAt else None,
        }

    @staticmethod
    def update_traitement(traitement_id, traitant_id, data):
        """Mettre a jour les commentaires et le scoring manuel du traitement."""
        traitement = TraitementDossier.query.get(traitement_id)
        if not traitement:
            raise ValueError('Traitement non trouve.')
        if traitement.traitant_id != traitant_id:
            raise ValueError("Vous n'etes pas le traitant assigne a ce dossier.")
        if traitement.statut not in ('en_cours',):
            raise ValueError('Ce traitement n\'est plus modifiable.')

        if 'commentaires_par_rubrique' in data:
            commentaires = data['commentaires_par_rubrique']
            if not isinstance(commentaires, dict):
                raise ValueError('commentaires_par_rubrique doit etre un objet.')
            traitement.commentaires_par_rubrique = commentaires
        if 'score_manuel' in data:
            try:
                score = int(data['score_manuel'])
                if score < 0 or score > 100:
                    raise ValueError('Le score doit etre entre 0 et 100.')
                traitement.score_manuel = score
                traitement.niveau_conformite = ScoringService.classifier(score).value
            except (ValueError, TypeError):
                raise ValueError('Score invalide.')
        if 'recommandations' in data:
            traitement.recommandations = data.get('recommandations')

        db.session.commit()
        return traitement

    @staticmethod
    def soumettre_pour_validation(traitement_id, traitant_id):
        """L'editeur soumet son traitement pour validation N+1."""
        traitement = TraitementDossier.query.get(traitement_id)
        if not traitement:
            raise ValueError('Traitement non trouve.')
        if traitement.traitant_id != traitant_id:
            raise ValueError("Vous n'etes pas le traitant.")
        if traitement.statut != 'en_cours':
            raise ValueError('Le traitement n\'est plus en cours.')

        # Mettre a jour le workflow de l'entite
        wf = EntiteWorkflow.query.get(traitement.entite_id)
        if wf:
            wf.statut = StatutWorkflowEnum.en_verification
        traitement.statut = 'soumis_validation'
        db.session.commit()
        return traitement

    @staticmethod
    def valider_traitement(traitement_id, validateur_id, decision, motif=None):
        """Le validateur N+1 (Admin/Super Admin) approuve ou retourne."""
        if decision not in ('approuve', 'retourne'):
            raise ValueError('Decision invalide.')
        traitement = TraitementDossier.query.get(traitement_id)
        if not traitement:
            raise ValueError('Traitement non trouve.')
        if traitement.statut != 'soumis_validation':
            raise ValueError('Ce traitement n\'est pas en attente de validation.')

        traitement.valide_par = validateur_id
        traitement.valide_le = datetime.now(timezone.utc)
        traitement.decision_validation = decision
        traitement.motif_retour = motif if decision == 'retourne' else None
        traitement.statut = 'valide' if decision == 'approuve' else 'retourne_entreprise'

        # Mettre a jour le statut de l'entite et la conformite
        entite = traitement.entite
        wf = EntiteWorkflow.query.get(traitement.entite_id)
        conformite = EntiteConformite.query.get(traitement.entite_id)

        if decision == 'approuve':
            # Appliquer le score manuel et le niveau de conformite finals
            if conformite:
                conformite.score_conformite = traitement.score_manuel
                conformite.statut_conformite = ScoringService.classifier(
                    traitement.score_manuel or 0
                )
            if wf:
                # Conforme : valide. Sinon : en_attente_complements (revision attendue)
                if (traitement.score_manuel or 0) >= 100:
                    wf.statut = StatutWorkflowEnum.conforme
                elif (traitement.score_manuel or 0) >= 70:
                    wf.statut = StatutWorkflowEnum.conforme_sous_reserve
                else:
                    wf.statut = StatutWorkflowEnum.en_attente_complements
                wf.date_validation = datetime.now(timezone.utc)

            # Notifier l'entreprise
            try:
                from app.models import Notification
                if entite and entite.compte_entreprise_id:
                    n = Notification(
                        destinataire_type='entreprise',
                        destinataire_id=entite.compte_entreprise_id,
                        type='dossier_traite',
                        titre='Votre dossier a ete examine',
                        message=(
                            "L'ARTCI a termine l'examen de votre dossier. "
                            "Vous pouvez maintenant reviser votre formulaire si necessaire."
                        ),
                        entite_id=entite.id,
                        lue=False,
                    )
                    db.session.add(n)
            except Exception:
                pass
        else:  # retourne
            if wf:
                wf.statut = StatutWorkflowEnum.brouillon  # remis en brouillon pour le traitant

        db.session.commit()
        return traitement
