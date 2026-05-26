"""
Service du modele PR : gestion des revisions et commentaires ancres.

Responsabilites :
- snapshot d'une revision a chaque (re-)soumission entreprise
- gestion des commentaires : creation, resolution, reponse entreprise
- garde-fou de convergence : tous commentaires open de la derniere revision
  doivent etre resolved pour valider un cycle
- recalcul du score apres validation et auto-depublication si < 70
"""
from datetime import datetime, timezone
from sqlalchemy import func
from app.extensions import db
from app.models import (
    DossierRevision, CommentaireDossier,
    EntiteBase, EntiteWorkflow, EntiteConformite,
    Notification, DossierEvenement, AssignationDemande,
)
from app.models.enums import StatutWorkflowEnum, StatutConformiteEnum


# Seuils officiels de conformite (cf. spec §6, MODELE §6.7)
SEUIL_PUBLIABLE = 70
SEUIL_CONFORME = 100


def log_evenement(entite_id, evenement_type, payload=None,
                  acteur_user_id=None, acteur_compte_id=None, acteur_role=None):
    """Helper d'audit trail (manœuvre A) : ecrit un DossierEvenement.

    Cette fonction est append-only : aucun update/delete ne sera fait dessus.
    """
    ev = DossierEvenement(
        entite_id=entite_id,
        evenement_type=evenement_type,
        acteur_user_id=acteur_user_id,
        acteur_compte_id=acteur_compte_id,
        acteur_role=acteur_role or ('system' if not (acteur_user_id or acteur_compte_id) else None),
        payload=payload or {},
    )
    db.session.add(ev)
    return ev


class DossierRevisionService:

    # ---------------------------------------------------------------
    # REVISIONS
    # ---------------------------------------------------------------

    @staticmethod
    def snapshot_revision(entite, reponses, soumis_par_compte_id, score_auto=None):
        """Cree une nouvelle revision figee a partir des reponses courantes.
        Appele a chaque (re-)soumission entreprise.
        """
        # Numero de revision = max + 1 (ou 1 si premiere)
        last_num = (
            db.session.query(func.max(DossierRevision.numero_revision))
            .filter_by(entite_id=entite.id)
            .scalar()
        )
        next_num = (last_num or 0) + 1

        wf = EntiteWorkflow.query.get(entite.id)
        statut = wf.statut.value if wf and wf.statut else None

        revision = DossierRevision(
            entite_id=entite.id,
            numero_revision=next_num,
            reponses_snapshot=reponses,
            statut_au_moment=statut,
            score_automatique_snapshot=score_auto,
            soumis_par_compte_id=soumis_par_compte_id,
        )
        db.session.add(revision)
        db.session.flush()  # pour avoir l'id sans commit

        # Audit trail (manœuvre A)
        log_evenement(
            entite_id=entite.id,
            evenement_type='soumission' if next_num == 1 else 're_soumission',
            payload={'numero_revision': next_num, 'score_auto_snapshot': score_auto},
            acteur_compte_id=soumis_par_compte_id,
            acteur_role='entreprise',
        )
        return revision

    @staticmethod
    def derniere_revision(entite_id):
        """Retourne la derniere revision en date pour une entite (ou None)."""
        return (
            DossierRevision.query
            .filter_by(entite_id=entite_id)
            .order_by(DossierRevision.numero_revision.desc())
            .first()
        )

    @staticmethod
    def lister_revisions(entite_id):
        """Retourne toutes les revisions d'une entite, ordre chronologique."""
        return (
            DossierRevision.query
            .filter_by(entite_id=entite_id)
            .order_by(DossierRevision.numero_revision.asc())
            .all()
        )

    @staticmethod
    def diff_revisions(rev_a, rev_b):
        """Diff simple par rubrique (retro-compat).
        Retourne {rubrique: 'modifiee'|'ajoutee'|'supprimee'|'inchangee'}.
        """
        a = rev_a.reponses_snapshot or {}
        b = rev_b.reponses_snapshot or {}
        rubriques = set(list(a.keys()) + list(b.keys()))
        diff = {}
        for rub in rubriques:
            if rub not in a:
                diff[rub] = 'ajoutee'
            elif rub not in b:
                diff[rub] = 'supprimee'
            elif a[rub] != b[rub]:
                diff[rub] = 'modifiee'
            else:
                diff[rub] = 'inchangee'
        return diff

    @staticmethod
    def diff_revisions_detail(rev_a, rev_b):
        """Diff semantique detaille champ par champ entre deux revisions.

        Pour chaque rubrique modifiee, on plonge dans le sous-dict pour
        identifier les CHAMPS modifies, avec valeur AVANT et APRES.

        Retourne :
        {
          'rubriques': {
            'identification': {
              'etat': 'modifiee',
              'champs': [
                {'cle': 'volume_donnees', 'avant': 'moins_1000', 'apres': '1000_10000'},
                {'cle': 'localisation.latitude', 'avant': 5.32, 'apres': 5.34},
                ...
              ],
            },
            'cadre_juridique': {'etat': 'inchangee', 'champs': []},
          },
          'total_champs_modifies': 4,
          'total_rubriques_modifiees': 1,
        }
        """
        a = rev_a.reponses_snapshot or {}
        b = rev_b.reponses_snapshot or {}
        rubriques = sorted(set(list(a.keys()) + list(b.keys())))
        result = {'rubriques': {}, 'total_champs_modifies': 0, 'total_rubriques_modifiees': 0}

        for rub in rubriques:
            val_a = a.get(rub)
            val_b = b.get(rub)
            if val_a == val_b:
                result['rubriques'][rub] = {'etat': 'inchangee', 'champs': []}
                continue
            if val_a is None:
                result['rubriques'][rub] = {'etat': 'ajoutee', 'champs': []}
                result['total_rubriques_modifiees'] += 1
                continue
            if val_b is None:
                result['rubriques'][rub] = {'etat': 'supprimee', 'champs': []}
                result['total_rubriques_modifiees'] += 1
                continue

            # Drill-down par champ (pour dicts uniquement, sinon valeur globale)
            champs = DossierRevisionService._champs_diff('', val_a, val_b)
            result['rubriques'][rub] = {'etat': 'modifiee', 'champs': champs}
            result['total_rubriques_modifiees'] += 1
            result['total_champs_modifies'] += len(champs)

        return result

    @staticmethod
    def _champs_diff(prefix, a, b):
        """Plat le diff entre deux valeurs en liste de {cle, avant, apres}.
        Cle est en notation pointee (ex: 'localisation.latitude').
        Pour les listes (multi-select), on calcule ajout/retrait d'elements.
        """
        result = []
        # Cas dict : on descend recursivement
        if isinstance(a, dict) and isinstance(b, dict):
            cles = sorted(set(list(a.keys()) + list(b.keys())))
            for k in cles:
                sous_prefix = f"{prefix}.{k}" if prefix else k
                va = a.get(k)
                vb = b.get(k)
                if va == vb:
                    continue
                if isinstance(va, dict) and isinstance(vb, dict):
                    result.extend(DossierRevisionService._champs_diff(sous_prefix, va, vb))
                else:
                    result.append(DossierRevisionService._format_champ_diff(sous_prefix, va, vb))
            return result

        # Cas liste : on calcule les ajouts/retraits (multi-select)
        if isinstance(a, list) and isinstance(b, list):
            try:
                set_a = set(a)
                set_b = set(b)
                ajoutes = sorted(set_b - set_a, key=str)
                retires = sorted(set_a - set_b, key=str)
                if ajoutes or retires:
                    result.append({
                        'cle': prefix,
                        'avant': sorted(a, key=str),
                        'apres': sorted(b, key=str),
                        'ajoutes': list(ajoutes),
                        'retires': list(retires),
                        'type': 'liste',
                    })
                return result
            except TypeError:
                # Liste de dicts non hashables : diff brut
                pass

        # Valeur scalaire ou non-comparable : diff brut
        result.append(DossierRevisionService._format_champ_diff(prefix, a, b))
        return result

    @staticmethod
    def _format_champ_diff(cle, avant, apres):
        return {
            'cle': cle,
            'avant': avant,
            'apres': apres,
            'type': 'scalaire',
        }

    # ---------------------------------------------------------------
    # COMMENTAIRES ANCRES
    # ---------------------------------------------------------------

    @staticmethod
    def creer_commentaire(
        entite_id, agent_id, rubrique, contenu,
        sous_question=None, revision_id=None,
        parent_id=None, auteur_role='editor',
    ):
        """Cree un commentaire ancre, etat 'open' par defaut.

        parent_id : si fourni, c'est une reponse au commentaire parent (thread).
        auteur_role : 'super_admin'|'admin'|'editor' (defaut editor).
        """
        if not rubrique or not contenu or not contenu.strip():
            raise ValueError("rubrique et contenu sont obligatoires.")
        # Si pas de revision passee, on pointe sur la derniere
        if not revision_id:
            rev = DossierRevisionService.derniere_revision(entite_id)
            revision_id = rev.id if rev else None
        commentaire = CommentaireDossier(
            entite_id=entite_id,
            agent_id=agent_id,
            rubrique=rubrique,
            sous_question=sous_question,
            contenu=contenu.strip(),
            revision_id=revision_id,
            etat='open',
            parent_id=parent_id,
            auteur_role=auteur_role,
        )
        db.session.add(commentaire)
        db.session.flush()

        log_evenement(
            entite_id=entite_id,
            evenement_type='commentaire_ajoute',
            payload={
                'commentaire_id': commentaire.id,
                'rubrique': rubrique,
                'sous_question': sous_question,
                'parent_id': parent_id,
            },
            acteur_user_id=agent_id,
            acteur_role=auteur_role,
        )
        return commentaire

    @staticmethod
    def editer_commentaire(commentaire_id, agent_id, nouveau_contenu):
        """L'agent peut editer son propre commentaire AVANT resolution.
        Apres resolution, plus modifiable (cf. orientation #2)."""
        c = CommentaireDossier.query.get(commentaire_id)
        if not c:
            raise ValueError("Commentaire introuvable.")
        if c.agent_id != agent_id:
            raise PermissionError("Seul l'auteur peut éditer son commentaire.")
        if c.etat == 'resolved':
            raise ValueError("Un commentaire résolu ne peut plus être édité.")
        if not nouveau_contenu or not nouveau_contenu.strip():
            raise ValueError("Contenu requis.")
        c.contenu = nouveau_contenu.strip()
        c.edited_at = datetime.now(timezone.utc)
        db.session.flush()
        return c

    @staticmethod
    def resoudre_commentaire(commentaire_id, agent_id):
        """Marque un commentaire comme resolu. RESERVE A L'AGENT.

        Idempotent : appel sur un deja-resolu = no-op.
        """
        c = CommentaireDossier.query.get(commentaire_id)
        if not c:
            raise ValueError("Commentaire introuvable.")
        if c.etat == 'resolved':
            return c  # idempotent
        c.etat = 'resolved'
        c.resolu_par = agent_id
        c.resolu_le = datetime.now(timezone.utc)
        db.session.flush()

        log_evenement(
            entite_id=c.entite_id,
            evenement_type='commentaire_resolu',
            payload={'commentaire_id': c.id, 'rubrique': c.rubrique},
            acteur_user_id=agent_id,
            acteur_role='agent',
        )
        return c

    @staticmethod
    def repondre_commentaire(commentaire_id, reponse, compte_id):
        """L'entreprise repond a un commentaire. NE LE RESOUT PAS
        (seul l'agent peut resoudre)."""
        c = CommentaireDossier.query.get(commentaire_id)
        if not c:
            raise ValueError("Commentaire introuvable.")
        if c.entite and c.entite.compte_entreprise_id != compte_id:
            raise PermissionError("Acces refuse : commentaire d'une autre entreprise.")
        c.reponse_entreprise = (reponse or '').strip() or None
        c.repondu_le = datetime.now(timezone.utc) if reponse else None
        db.session.flush()

        log_evenement(
            entite_id=c.entite_id,
            evenement_type='commentaire_repondu',
            payload={'commentaire_id': c.id, 'rubrique': c.rubrique},
            acteur_compte_id=compte_id,
            acteur_role='entreprise',
        )
        return c

    @staticmethod
    def lister_commentaires(entite_id, etat=None, revision_id=None):
        """Liste les commentaires d'un dossier, filtrables par etat ou revision."""
        q = CommentaireDossier.query.filter_by(entite_id=entite_id)
        if etat:
            q = q.filter_by(etat=etat)
        if revision_id:
            q = q.filter_by(revision_id=revision_id)
        return q.order_by(
            CommentaireDossier.rubrique.asc(),
            CommentaireDossier.cree_le.asc(),
        ).all()

    @staticmethod
    def commentaires_groupes_par_rubrique(entite_id, etat=None):
        """Retourne {rubrique: [commentaires]} pour affichage contextuel."""
        commentaires = DossierRevisionService.lister_commentaires(entite_id, etat=etat)
        groupes = {}
        for c in commentaires:
            groupes.setdefault(c.rubrique, []).append(c)
        return groupes

    # ---------------------------------------------------------------
    # CONVERGENCE
    # ---------------------------------------------------------------

    @staticmethod
    def commentaires_open_count(entite_id, revision_id=None):
        """Nombre de commentaires open (sur derniere revision si non specifie)."""
        q = CommentaireDossier.query.filter_by(entite_id=entite_id, etat='open')
        if revision_id:
            q = q.filter_by(revision_id=revision_id)
        return q.count()

    @staticmethod
    def peut_converger(entite_id):
        """Le dossier peut converger (= validation possible) si tous les
        commentaires open de la derniere revision sont resolus."""
        rev = DossierRevisionService.derniere_revision(entite_id)
        if not rev:
            return True  # pas de revision = pas de blocage
        return DossierRevisionService.commentaires_open_count(entite_id, rev.id) == 0

    @staticmethod
    def commentaires_bloquant_resoumission(entite_id, nouvelles_reponses):
        """Liste les commentaires open qui empechent la re-soumission entreprise.

        Orientation #1 : un commentaire open est "traite" cote entreprise si :
        - la rubrique commentee a ete MODIFIEE depuis la derniere revision
          (comparaison snapshot vs nouvelles reponses), OU
        - une reponse_entreprise a ete postee sur le commentaire.

        Sinon : il bloque la re-soumission.

        Retourne la liste des commentaires bloquants. Vide = re-soumission OK.
        """
        derniere_rev = DossierRevisionService.derniere_revision(entite_id)
        if not derniere_rev:
            # Premiere soumission : rien a bloquer
            return []
        snap = derniere_rev.reponses_snapshot or {}
        commentaires_open = (
            CommentaireDossier.query
            .filter_by(entite_id=entite_id, etat='open')
            .all()
        )
        bloquants = []
        for c in commentaires_open:
            # Critere 1 : reponse explicite postee
            if c.reponse_entreprise and c.reponse_entreprise.strip():
                continue
            # Critere 2 : rubrique modifiee depuis le dernier snapshot
            ancienne_valeur = snap.get(c.rubrique)
            nouvelle_valeur = (nouvelles_reponses or {}).get(c.rubrique)
            if ancienne_valeur != nouvelle_valeur:
                continue
            # Ni l'un ni l'autre : bloquant
            bloquants.append(c)
        return bloquants

    # ---------------------------------------------------------------
    # SCORE & PUBLICATION
    # ---------------------------------------------------------------

    @staticmethod
    def appliquer_score_final(entite_id, score, niveau=None,
                              acteur_user_id=None, source='validation'):
        """Applique le score final et le niveau de conformite a l'entite.

        Cree EntiteConformite si elle n'existe pas (premier traitement).
        Declenche la depublication automatique si le nouveau score retombe
        sous le seuil de publication (70).

        Idempotence (manœuvre D) : si le score n'a pas change ET le niveau
        n'a pas change, on n'envoie pas de double notification ni de double
        evenement. Les notifications/evenements ne se declenchent que sur
        une transition reelle d'etat.

        score : entier 0..100
        niveau : libelle (sinon calcule auto selon les seuils)
        acteur_user_id : agent qui valide (None = system)
        source : libelle pour l'audit ('validation', 're_soumission_recalc', ...)
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError("Entite introuvable.")

        # Calcul auto du niveau si non fourni
        if niveau is None:
            niveau = DossierRevisionService.niveau_pour_score(score)

        conformite = EntiteConformite.query.get(entite_id)
        is_first = conformite is None
        if is_first:
            # Premier traitement : on cree EntiteConformite
            conformite = EntiteConformite(entite_id=entite_id)
            db.session.add(conformite)

        ancien_score = conformite.score_conformite
        ancien_niveau = conformite.statut_conformite

        conformite.score_conformite = score
        # Mappe niveau texte vers enum
        nouveau_statut = DossierRevisionService._enum_for_niveau(niveau)
        conformite.statut_conformite = nouveau_statut

        # Idempotence : si rien n'a change, on s'arrete la
        if not is_first and ancien_score == score and ancien_niveau == nouveau_statut:
            return conformite

        # Audit : score modifie
        log_evenement(
            entite_id=entite_id,
            evenement_type='score_modifie',
            payload={
                'score_avant': ancien_score,
                'score_apres': score,
                'niveau_avant': ancien_niveau.value if ancien_niveau else None,
                'niveau_apres': nouveau_statut.value if nouveau_statut else None,
                'source': source,
            },
            acteur_user_id=acteur_user_id,
            acteur_role='agent' if acteur_user_id else 'system',
        )

        # Auto-depublication si publiee et nouveau score < seuil (manœuvre §3)
        if entite.publie_sur_carte and score < SEUIL_PUBLIABLE:
            entite.publie_sur_carte = False
            # Notif entreprise
            DossierRevisionService._notifier_entreprise(
                entite,
                titre="Votre fiche a été retirée de la carte publique",
                message=(
                    "Suite à une mise à jour de votre dossier, votre score est "
                    f"redescendu à {score}/100, sous le seuil de publication (70). "
                    "Votre fiche est temporairement retirée de la cartographie publique. "
                    "Travaillez avec votre agent ARTCI pour remonter au seuil."
                ),
                type_notif='depublication_auto',
            )
            # Notif agent assigne (orientation #3)
            DossierRevisionService._notifier_agent_assigne(
                entite,
                titre=f"Dépublication automatique : {entite.denomination}",
                message=(
                    f"L'entité {entite.denomination} a été automatiquement dépubliée "
                    f"suite à un score retombé à {score}/100 (seuil : 70)."
                ),
                type_notif='depublication_auto',
            )
            # Audit : depublication_auto avec contexte
            log_evenement(
                entite_id=entite_id,
                evenement_type='depublication_auto',
                payload={
                    'score_avant': ancien_score,
                    'score_apres': score,
                    'declencheur': source,
                },
                acteur_user_id=acteur_user_id,
                acteur_role='agent' if acteur_user_id else 'system',
            )

        # Notifier l'entreprise du changement de niveau (transition significative)
        if ancien_niveau != nouveau_statut:
            DossierRevisionService._notifier_entreprise(
                entite,
                titre=f"Votre dossier a été évalué : {niveau}",
                message=(
                    f"L'ARTCI a évalué votre dossier. Statut : {niveau}. "
                    "Connectez-vous pour consulter les commentaires et recommandations."
                ),
                type_notif='evaluation_dossier',
            )

        return conformite

    @staticmethod
    def notifier_republication_disponible(entite_id):
        """Quand le score regagne le seuil 70 sans avoir ete republie,
        notifier l'entreprise + l'agent assigne pour qu'ils sachent
        qu'une publication explicite est possible.

        La re-publication elle-meme reste une action manuelle de l'agent
        (cf. modele §6.7 : "le franchissement du seuil rend possible la
        publication mais ne la declenche pas").
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            return
        conformite = EntiteConformite.query.get(entite_id)
        if not conformite or (conformite.score_conformite or 0) < SEUIL_PUBLIABLE:
            return
        if entite.publie_sur_carte:
            return  # deja publie

        DossierRevisionService._notifier_entreprise(
            entite,
            titre="Votre dossier est de nouveau publiable",
            message=(
                f"Votre score est revenu à {conformite.score_conformite}/100, "
                "au-dessus du seuil de publication (70). Votre agent ARTCI peut "
                "maintenant republier votre fiche sur la cartographie."
            ),
            type_notif='republication_possible',
        )
        DossierRevisionService._notifier_agent_assigne(
            entite,
            titre=f"Republication possible : {entite.denomination}",
            message=(
                f"L'entité {entite.denomination} a regagné un score "
                f"de {conformite.score_conformite}/100. Vous pouvez maintenant "
                "la republier sur la cartographie publique si applicable."
            ),
            type_notif='republication_possible',
        )
        log_evenement(
            entite_id=entite_id,
            evenement_type='republication_possible',
            payload={'score': conformite.score_conformite},
            acteur_role='system',
        )

    @staticmethod
    def _enum_for_niveau(niveau):
        """Convertit un libelle de niveau en enum StatutConformiteEnum."""
        try:
            return StatutConformiteEnum(niveau)
        except ValueError:
            mapping = {
                'Non conforme': StatutConformiteEnum.non_conforme,
                'Conforme': StatutConformiteEnum.conforme,
                'Partiellement conforme': StatutConformiteEnum.partiellement_conforme,
                # Anciens libelles (compat ascendante / data historique)
                'Démarche en cours': StatutConformiteEnum.partiellement_conforme,
                'Démarche achevée': StatutConformiteEnum.partiellement_conforme,
            }
            return mapping.get(niveau, StatutConformiteEnum.non_conforme)

    @staticmethod
    def niveau_pour_score(score):
        """Calcule le niveau de conformite a partir du score :
        - 100     : Conforme
        - [70-99] : Partiellement conforme
        - [0-70[  : Non conforme
        """
        if score >= SEUIL_CONFORME:
            return 'Conforme'
        if score >= SEUIL_PUBLIABLE:
            return 'Partiellement conforme'
        return 'Non conforme'

    # ---------------------------------------------------------------
    # WORKFLOW : retour entreprise & re-soumission
    # ---------------------------------------------------------------

    @staticmethod
    def retourner_a_entreprise(entite_id, motif=None, acteur_user_id=None):
        """L'agent retourne le dossier a l'entreprise pour revision.
        Le statut workflow passe en 'en_attente_complements', le formulaire
        se degrise automatiquement cote entreprise (lecture seule levee).
        """
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError("Entite introuvable.")
        wf = EntiteWorkflow.query.get(entite_id)
        if not wf:
            raise ValueError("Workflow introuvable.")
        wf.statut = StatutWorkflowEnum.en_attente_complements
        if motif:
            wf.motif_rejet = motif

        DossierRevisionService._notifier_entreprise(
            entite,
            titre="Votre dossier a été retourné pour révision",
            message=(
                "L'ARTCI a annoté votre dossier. Connectez-vous pour consulter "
                "les commentaires et apporter les modifications demandées avant "
                "de re-soumettre."
                + (f"\nMotif global : {motif}" if motif else "")
            ),
            type_notif='retour_formulaire',
        )

        log_evenement(
            entite_id=entite_id,
            evenement_type='retour_entreprise',
            payload={'motif': motif},
            acteur_user_id=acteur_user_id,
            acteur_role='agent' if acteur_user_id else 'system',
        )

    # ---------------------------------------------------------------
    # HELPERS INTERNES
    # ---------------------------------------------------------------

    @staticmethod
    def _notifier_entreprise(entite, titre, message, type_notif):
        if not entite.compte_entreprise_id:
            return
        n = Notification(
            destinataire_type='entreprise',
            destinataire_id=entite.compte_entreprise_id,
            type=type_notif,
            titre=titre,
            message=message,
            entite_id=entite.id,
            lue=False,
        )
        db.session.add(n)

        # Email transactionnel en complement de la notif in-app (best effort)
        try:
            from app.models import CompteEntreprise
            from app.utils.email_sender import send_notification_email
            from flask import current_app
            compte = CompteEntreprise.query.get(entite.compte_entreprise_id)
            if compte and compte.email:
                nom = (compte.denomination or 'Madame/Monsieur')
                action_url = current_app.config.get(
                    'FRONTEND_URL', 'https://dcp.artci.ci',
                ) + '/entreprise/dashboard'
                send_notification_email(
                    to=compte.email, nom_complet=nom,
                    titre=titre, message=message, action_url=action_url,
                    action_label='Voir mon dossier',
                )
        except Exception:
            pass

    @staticmethod
    def _notifier_agent_assigne(entite, titre, message, type_notif):
        """Notifie le ou les agents actuellement assignes a l'entite (orientation #3).

        - Cree une Notification ARTCI in-app
        - Envoie un email transactionnel (best effort)
        """
        from app.models.enums import StatutAssignationEnum
        from app.models import User
        from app.utils.email_sender import send_notification_email
        from flask import current_app

        assignations = AssignationDemande.query.filter_by(
            entite_id=entite.id,
            statut=StatutAssignationEnum.en_cours,
        ).all()
        for a in assignations:
            n = Notification(
                destinataire_type='artci',
                destinataire_id=a.agent_id,
                type=type_notif,
                titre=titre,
                message=message,
                entite_id=entite.id,
                lue=False,
            )
            db.session.add(n)

            # Email best-effort
            try:
                agent = User.query.get(a.agent_id)
                if agent and agent.email:
                    nom = f"{agent.prenom or ''} {agent.nom or ''}".strip() or agent.email
                    action_url = (
                        current_app.config.get('FRONTEND_URL', 'https://dcp.artci.ci')
                        + f"/admin/traiter/{entite.id}"
                    )
                    send_notification_email(
                        to=agent.email, nom_complet=nom,
                        titre=titre, message=message, action_url=action_url,
                        action_label='Ouvrir le dossier',
                    )
            except Exception:
                pass
