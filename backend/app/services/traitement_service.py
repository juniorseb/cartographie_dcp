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
        """Recupere ou cree le traitement courant pour cette entite.

        Modele PR :
        - le score automatique est calcule en LECTURE SEULE (pas de
          persistance dans EntiteConformite tant que l'agent n'a pas valide)
        - le score auto sert d'aide a la decision, pas de verite
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entite non trouvee.')

        # Chercher un traitement en_cours pour cet agent
        traitement = TraitementDossier.query.filter_by(
            entite_id=entite_id, traitant_id=traitant_id,
        ).filter(TraitementDossier.statut.in_(['en_cours', 'soumis_validation'])).first()

        if not traitement:
            # Calcul score auto en lecture seule (pas de persistance EntiteConformite)
            try:
                score_auto, _statut = ScoringService.compute_score_only(entite)
            except Exception:
                score_auto = 0
            traitement = TraitementDossier(
                entite_id=entite_id,
                traitant_id=traitant_id,
                commentaires_par_rubrique={},  # legacy, conserve pour retrocompat
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
            'scores_par_rubrique': traitement.scores_par_rubrique or {},
            'scores_par_critere': traitement.scores_par_critere or {},
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
        if 'scores_par_rubrique' in data:
            scores = data['scores_par_rubrique']
            if not isinstance(scores, dict):
                raise ValueError('scores_par_rubrique doit etre un objet.')
            # Coerce to ints and clamp to plage raisonnable par rubrique (0-100).
            cleaned = {}
            for k, v in scores.items():
                try:
                    iv = int(v)
                    cleaned[k] = max(0, min(100, iv))
                except (ValueError, TypeError):
                    continue
            traitement.scores_par_rubrique = cleaned
        if 'scores_par_critere' in data:
            criteres = data['scores_par_critere']
            if not isinstance(criteres, dict):
                raise ValueError('scores_par_critere doit etre un objet.')
            # Format attendu : { critere_key: { note: int, commentaire: str } }
            cleaned_crit = {}
            for k, v in criteres.items():
                if not isinstance(v, dict):
                    continue
                try:
                    note = int(v.get('note', 0))
                except (ValueError, TypeError):
                    note = 0
                cleaned_crit[k] = {
                    'note': max(0, min(100, note)),
                    'commentaire': (v.get('commentaire') or '')[:1000],
                }
            traitement.scores_par_critere = cleaned_crit
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
        """L'editeur soumet son traitement pour validation N+1.

        Modele PR : convergence requise. Avant remontee a l'admin, on verifie
        qu'il N'Y A PLUS DE COMMENTAIRES OPEN sur la derniere revision (sinon
        l'editeur n'a pas encore acheve son cycle de revue).
        """
        from app.services.dossier_revision_service import DossierRevisionService

        traitement = TraitementDossier.query.get(traitement_id)
        if not traitement:
            raise ValueError('Traitement non trouve.')
        if traitement.traitant_id != traitant_id:
            raise ValueError("Vous n'etes pas le traitant.")
        if traitement.statut != 'en_cours':
            raise ValueError('Le traitement n\'est plus en cours.')

        # Garde-fou convergence : tous commentaires open doivent etre traites
        open_count = DossierRevisionService.commentaires_open_count(
            traitement.entite_id
        )
        if open_count > 0:
            raise ValueError(
                f"Convergence non atteinte : {open_count} commentaire(s) encore "
                "ouvert(s) sur la derniere revision. Resolvez ou retournez-les "
                "a l'entreprise avant de soumettre pour validation N+1."
            )

        # Mettre a jour le workflow de l'entite
        wf = EntiteWorkflow.query.get(traitement.entite_id)
        if wf:
            wf.statut = StatutWorkflowEnum.en_verification
        traitement.statut = 'soumis_validation'
        db.session.commit()
        return traitement

    @staticmethod
    def valider_traitement(traitement_id, validateur_id, decision, motif=None):
        """Le validateur N+1 (Admin/Super Admin) approuve ou retourne.

        Modele PR :
        - 'approuve' : applique le score final via DossierRevisionService
          (qui cree EntiteConformite si premier traitement et gere
          l'auto-depublication si le score retombe < 70)
        - 'retourne' : passe l'entite en en_attente_complements pour rouvrir
          le formulaire cote entreprise (degrisement automatique)
        """
        from app.services.dossier_revision_service import DossierRevisionService

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

        wf = EntiteWorkflow.query.get(traitement.entite_id)

        if decision == 'approuve':
            # Applique le score final via service (cree EntiteConformite si
            # 1er traitement, declenche auto-depublication si necessaire,
            # notifie l'entreprise du nouveau niveau de conformite,
            # idempotent si rappele avec le meme score).
            score_final = traitement.score_manuel or 0
            DossierRevisionService.appliquer_score_final(
                entite_id=traitement.entite_id,
                score=score_final,
                acteur_user_id=validateur_id,
                source='validation_n_plus_1',
            )

            if wf:
                # Le statut workflow "conforme" a ete supprime : la conformite
                # est portee par le statut_conformite (table conformite), pas
                # par le workflow. A 100, le dossier est simplement "valide".
                if score_final >= 100:
                    wf.statut = StatutWorkflowEnum.valide
                elif score_final >= 70:
                    wf.statut = StatutWorkflowEnum.conforme_sous_reserve
                else:
                    # Score < 70 : on rend la main a l'entreprise pour revision
                    wf.statut = StatutWorkflowEnum.en_attente_complements
                wf.date_validation = datetime.now(timezone.utc)

            # Audit : validation N+1 approuvee
            from app.services.dossier_revision_service import log_evenement
            log_evenement(
                entite_id=traitement.entite_id,
                evenement_type='validation_n_plus_1',
                payload={
                    'decision': 'approuve',
                    'score_final': score_final,
                    'traitement_id': traitement.id,
                },
                acteur_user_id=validateur_id,
                acteur_role='admin',
            )
        else:
            # Retour vers l'entreprise via service (notifie + degrise formulaire + log)
            DossierRevisionService.retourner_a_entreprise(
                entite_id=traitement.entite_id,
                motif=motif,
                acteur_user_id=validateur_id,
            )

        # Notifier l'editeur (traitant) du verdict du validateur N+1
        if traitement.traitant_id and traitement.traitant_id != validateur_id:
            from app.models import Notification, User
            from app.utils.email_sender import send_notification_email
            from flask import current_app
            entite = EntiteBase.query.get(traitement.entite_id)
            denom = entite.denomination if entite else 'dossier'
            if decision == 'approuve':
                titre = f"Traitement approuvé : {denom}"
                message = (
                    f"Votre traitement du dossier {denom} a été approuvé par la "
                    f"validation N+1 (score final {traitement.score_manuel or 0}/100)."
                )
            else:
                titre = f"Traitement retourné : {denom}"
                message = (
                    f"Votre traitement du dossier {denom} a été retourné par le "
                    f"validateur N+1. Motif : {motif or '(non précisé)'}"
                )
            db.session.add(Notification(
                destinataire_type='artci',
                destinataire_id=traitement.traitant_id,
                type=f'validation_n_plus_1_{decision}',
                titre=titre,
                message=message,
                entite_id=traitement.entite_id,
                lue=False,
            ))

            # Email transactionnel (best effort)
            try:
                editeur = User.query.get(traitement.traitant_id)
                if editeur and editeur.email:
                    nom = f"{editeur.prenom or ''} {editeur.nom or ''}".strip() or editeur.email
                    action_url = (
                        current_app.config.get('FRONTEND_URL', 'https://dcp.artci.ci')
                        + f"/admin/traiter/{traitement.entite_id}"
                    )
                    send_notification_email(
                        to=editeur.email, nom_complet=nom,
                        titre=titre, message=message, action_url=action_url,
                        action_label='Ouvrir le dossier',
                    )
            except Exception:
                pass

        db.session.commit()
        return traitement
