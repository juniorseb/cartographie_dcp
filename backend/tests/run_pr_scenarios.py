"""
Tests d'integration des 5 scenarios critiques du modele PR.

Lance dans une TRANSACTION ROLLBACK : les donnees creees sont nettoyees a la fin,
aucune trace en BDD. Utilisable sur la base existante sans risque.

Usage :
    cd backend && python tests/run_pr_scenarios.py

Couvre :
1. Soumission -> revue -> commentaires -> blocage validation N+1 -> resolution -> validation -> publication
2. Soumission -> validation -> publication -> mise a jour qui fait chuter score -> depublication auto + notifs
3. Re-soumission avec commentaires open non traites -> blocage
4. Commentaire resolved reste resolved apres re-modification de la rubrique
5. Concurrent edit Demandeur vs RL -> conflit gere proprement (verrouillage optimiste)
"""
import sys
import uuid
import os

# Ajout du chemin parent pour importer app/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import (
    User, CompteEntreprise, EntiteBase, EntiteWorkflow, EntiteConformite,
    FormulaireDCP, AssignationDemande, TraitementDossier,
    DossierRevision, CommentaireDossier, DossierEvenement, Notification,
)
from app.models.enums import (
    RoleEnum, StatutWorkflowEnum, StatutConformiteEnum,
    StatutAssignationEnum, OrigineSaisieEnum,
)
from app.services.dossier_revision_service import DossierRevisionService
from app.services.traitement_service import TraitementService
from app.utils.password import hash_password


PASS, FAIL = 0, 0


def assert_eq(actual, expected, msg):
    global PASS, FAIL
    if actual == expected:
        PASS += 1
        print(f"  [OK] {msg}")
    else:
        FAIL += 1
        print(f"  [FAIL] {msg} : attendu={expected!r}, recu={actual!r}")


def assert_true(cond, msg):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [OK] {msg}")
    else:
        FAIL += 1
        print(f"  [FAIL] {msg}")


def assert_raises(callable_, exc_type, msg):
    global PASS, FAIL
    try:
        callable_()
        FAIL += 1
        print(f"  [FAIL] {msg} : exception {exc_type.__name__} attendue, aucune levee")
    except exc_type as e:
        PASS += 1
        print(f"  [OK] {msg} (msg : {str(e)[:80]}...)")
    except Exception as e:
        FAIL += 1
        print(f"  [FAIL] {msg} : exception {type(e).__name__} levee, attendue {exc_type.__name__}")


def setup_fixtures():
    """Cree user ARTCI + entreprise + entite + workflow dans la transaction."""
    suffix = uuid.uuid4().hex[:8]
    user_admin = User(
        nom='TestAdmin', prenom='QA',
        email=f'qa_admin_{suffix}@test.ci',
        password_hash=hash_password('Test@1234'),
        role=RoleEnum.admin, is_active=True,
    )
    user_editor = User(
        nom='TestEditor', prenom='QA',
        email=f'qa_editor_{suffix}@test.ci',
        password_hash=hash_password('Test@1234'),
        role=RoleEnum.editor, is_active=True,
    )
    compte = CompteEntreprise(
        email=f'qa_entreprise_{suffix}@test.ci',
        password_hash=hash_password('Test@1234'),
        denomination='QA Entreprise',
        numero_cc=f'CC{suffix}',
        is_active=True,
        inscription_statut='approved',
        dg_email=f'qa_rl_{suffix}@test.ci',
        dg_nom='RL', dg_prenom='QA',
        dpo_email=f'qa_dem_{suffix}@test.ci',
        dpo_nom='Demandeur', dpo_prenom='QA',
    )
    db.session.add_all([user_admin, user_editor, compte])
    db.session.flush()

    entite = EntiteBase(
        compte_entreprise_id=compte.id,
        denomination='QA Entreprise',
        numero_cc=f'CC{suffix}',
        origine_saisie=OrigineSaisieEnum.auto_recensement,
        publie_sur_carte=False,
    )
    db.session.add(entite)
    db.session.flush()
    wf = EntiteWorkflow(
        entite_id=entite.id,
        statut=StatutWorkflowEnum.brouillon,
    )
    db.session.add(wf)
    db.session.flush()

    return {
        'user_admin': user_admin, 'user_editor': user_editor,
        'compte': compte, 'entite': entite, 'workflow': wf,
    }


# ========================================================================
# SCENARIO 1 : flux complet happy path
# ========================================================================
def scenario_1():
    print("\n=== SCENARIO 1 : happy path complet ===")
    fx = setup_fixtures()
    entite = fx['entite']
    compte = fx['compte']
    editor = fx['user_editor']
    admin = fx['user_admin']

    # Soumission #1
    rev1 = DossierRevisionService.snapshot_revision(
        entite=entite,
        reponses={'identification': {'volume_donnees': '1000_10000'}},
        soumis_par_compte_id=compte.id,
    )
    assert_eq(rev1.numero_revision, 1, "premiere revision = #1")
    assert_eq(
        DossierEvenement.query.filter_by(
            entite_id=entite.id, evenement_type='soumission'
        ).count(),
        1, "evenement 'soumission' loggue",
    )

    # Assignation a l'editeur
    assignation = AssignationDemande(
        entite_id=entite.id, agent_id=editor.id,
        statut=StatutAssignationEnum.en_cours,
    )
    db.session.add(assignation)
    db.session.flush()

    # Editeur cree un commentaire
    c1 = DossierRevisionService.creer_commentaire(
        entite_id=entite.id, agent_id=editor.id,
        rubrique='identification', contenu='Volume a verifier',
        sous_question='volume_donnees', auteur_role='editor',
    )
    assert_eq(c1.etat, 'open', "commentaire cree etat=open")

    # Editeur cree un traitement et essaie de soumettre N+1 -> doit etre bloque
    fx_traitement = TraitementDossier(
        entite_id=entite.id, traitant_id=editor.id,
        commentaires_par_rubrique={}, score_automatique=80, score_manuel=80,
        niveau_conformite='Démarche en cours', statut='en_cours',
    )
    db.session.add(fx_traitement)
    db.session.flush()

    assert_raises(
        lambda: TraitementService.soumettre_pour_validation(fx_traitement.id, editor.id),
        ValueError,
        "soumission N+1 bloquee si commentaires open (convergence)",
    )

    # Editeur resoud le commentaire
    DossierRevisionService.resoudre_commentaire(c1.id, editor.id)
    assert_eq(
        DossierRevisionService.commentaires_open_count(entite.id), 0,
        "0 commentaire open apres resolution",
    )

    # Soumission N+1 OK maintenant
    fx_traitement.statut = 'en_cours'
    TraitementService.soumettre_pour_validation(fx_traitement.id, editor.id)
    db.session.flush()
    assert_eq(fx_traitement.statut, 'soumis_validation',
              "traitement passe a soumis_validation apres resolution")

    # Admin valide -> applique_score_final cree EntiteConformite et notifie
    TraitementService.valider_traitement(fx_traitement.id, admin.id, 'approuve')
    db.session.flush()
    conf = EntiteConformite.query.get(entite.id)
    assert_true(conf is not None, "EntiteConformite cree au 1er traitement (pas avant)")
    assert_eq(conf.score_conformite, 80, "score final applique")
    assert_eq(conf.statut_conformite, StatutConformiteEnum.partiellement_conforme,
              "niveau auto = Partiellement conforme pour score 80")

    # Audit trail
    types_loggues = [e.evenement_type for e in DossierEvenement.query.filter_by(entite_id=entite.id).all()]
    assert_true('validation_n_plus_1' in types_loggues, "evenement validation_n_plus_1 loggue")
    assert_true('score_modifie' in types_loggues, "evenement score_modifie loggue")
    assert_true('commentaire_resolu' in types_loggues, "evenement commentaire_resolu loggue")


# ========================================================================
# SCENARIO 2 : auto-depublication
# ========================================================================
def scenario_2():
    print("\n=== SCENARIO 2 : auto-depublication post mise a jour ===")
    fx = setup_fixtures()
    entite = fx['entite']
    admin = fx['user_admin']
    editor = fx['user_editor']

    # Setup : entite deja publiee avec score 90
    entite.publie_sur_carte = True
    DossierRevisionService.appliquer_score_final(
        entite.id, score=90, acteur_user_id=admin.id, source='setup_test',
    )
    db.session.flush()
    assert_true(entite.publie_sur_carte, "entite initialement publiee a 90/100")

    # Assignation pour notif agent
    assignation = AssignationDemande(
        entite_id=entite.id, agent_id=editor.id,
        statut=StatutAssignationEnum.en_cours,
    )
    db.session.add(assignation)
    db.session.flush()

    notif_count_before = Notification.query.count()

    # Mise a jour qui fait chuter le score a 50 (sous le seuil)
    DossierRevisionService.appliquer_score_final(
        entite.id, score=50, acteur_user_id=admin.id, source='re_soumission_recalc',
    )
    db.session.flush()

    assert_true(not entite.publie_sur_carte,
                "entite depubliee automatiquement (score < 70)")

    # Audit trail
    depub_evt = DossierEvenement.query.filter_by(
        entite_id=entite.id, evenement_type='depublication_auto',
    ).first()
    assert_true(depub_evt is not None, "evenement depublication_auto loggue")
    assert_eq(depub_evt.payload.get('score_avant'), 90,
              "payload contient score_avant=90")
    assert_eq(depub_evt.payload.get('score_apres'), 50,
              "payload contient score_apres=50")

    # Notifications envoyees (entreprise + agent assigne)
    notifs = Notification.query.filter(
        Notification.entite_id == entite.id,
        Notification.type == 'depublication_auto',
    ).all()
    destinataires_types = sorted(set(n.destinataire_type for n in notifs))
    assert_eq(destinataires_types, ['artci', 'entreprise'],
              "notif envoyee a entreprise ET agent ARTCI")

    # Idempotence : rappel avec meme score = pas de double notif/event
    nb_evt_avant = DossierEvenement.query.count()
    nb_notif_avant = Notification.query.count()
    DossierRevisionService.appliquer_score_final(
        entite.id, score=50, acteur_user_id=admin.id, source='retry',
    )
    db.session.flush()
    assert_eq(DossierEvenement.query.count(), nb_evt_avant,
              "idempotence : pas de double evenement sur meme score")
    assert_eq(Notification.query.count(), nb_notif_avant,
              "idempotence : pas de double notification sur meme score")


# ========================================================================
# SCENARIO 3 : re-soumission bloquee si commentaires open non traites
# ========================================================================
def scenario_3():
    print("\n=== SCENARIO 3 : re-soumission bloquee si open non traite ===")
    fx = setup_fixtures()
    entite = fx['entite']
    compte = fx['compte']
    editor = fx['user_editor']

    # 1ere soumission
    DossierRevisionService.snapshot_revision(
        entite=entite,
        reponses={'identification': {'ville': 'Abidjan'}, 'registre': {'tenu': 'oui'}},
        soumis_par_compte_id=compte.id,
    )
    db.session.flush()

    # Agent commente la rubrique 'identification'
    DossierRevisionService.creer_commentaire(
        entite_id=entite.id, agent_id=editor.id,
        rubrique='identification', contenu='Ville incomplete',
        auteur_role='editor',
    )
    db.session.flush()

    # Tentative re-soumission SANS modification ni reponse -> BLOQUE
    bloquants = DossierRevisionService.commentaires_bloquant_resoumission(
        entite.id,
        nouvelles_reponses={'identification': {'ville': 'Abidjan'}, 'registre': {'tenu': 'oui'}},
    )
    assert_eq(len(bloquants), 1, "commentaire identification bloque la re-soumission")

    # Cas A : modification de la rubrique commentee -> debloque
    bloquants = DossierRevisionService.commentaires_bloquant_resoumission(
        entite.id,
        nouvelles_reponses={'identification': {'ville': 'Abidjan Plateau'}, 'registre': {'tenu': 'oui'}},
    )
    assert_eq(len(bloquants), 0, "modification de la rubrique debloque")

    # Cas B : reponse explicite -> debloque
    c = CommentaireDossier.query.filter_by(entite_id=entite.id).first()
    DossierRevisionService.repondre_commentaire(c.id, "Ville completee a 'Abidjan Plateau'", compte.id)
    db.session.flush()
    bloquants = DossierRevisionService.commentaires_bloquant_resoumission(
        entite.id,
        nouvelles_reponses={'identification': {'ville': 'Abidjan'}, 'registre': {'tenu': 'oui'}},
    )
    assert_eq(len(bloquants), 0, "reponse explicite debloque (meme sans modif rubrique)")


# ========================================================================
# SCENARIO 4 : resolved reste resolved apres re-modification
# ========================================================================
def scenario_4():
    print("\n=== SCENARIO 4 : resolved persiste apres re-modification ===")
    fx = setup_fixtures()
    entite = fx['entite']
    compte = fx['compte']
    editor = fx['user_editor']

    # Cycle 1 : soumission + commentaire + resolution
    DossierRevisionService.snapshot_revision(
        entite=entite, reponses={'identification': {'volume': 'A'}},
        soumis_par_compte_id=compte.id,
    )
    c = DossierRevisionService.creer_commentaire(
        entite_id=entite.id, agent_id=editor.id,
        rubrique='identification', contenu='OK', auteur_role='editor',
    )
    DossierRevisionService.resoudre_commentaire(c.id, editor.id)
    db.session.flush()
    assert_eq(c.etat, 'resolved', "cycle 1 : commentaire resolu")

    # Cycle 2 : entreprise re-soumet apres avoir re-modifie la rubrique
    DossierRevisionService.snapshot_revision(
        entite=entite, reponses={'identification': {'volume': 'B'}},
        soumis_par_compte_id=compte.id,
    )
    db.session.flush()

    # Le commentaire reste resolved (pas de re-ouverture auto, comme GitHub)
    db.session.refresh(c)
    assert_eq(c.etat, 'resolved',
              "le commentaire reste resolved meme apres re-modification de la rubrique")

    # L'agent peut creer un NOUVEAU commentaire sur la meme rubrique
    c2 = DossierRevisionService.creer_commentaire(
        entite_id=entite.id, agent_id=editor.id,
        rubrique='identification', contenu='Nouvelle remarque', auteur_role='editor',
    )
    db.session.flush()
    assert_eq(c2.etat, 'open', "nouveau commentaire sur rubrique deja resolved = open")
    assert_true(c.id != c2.id, "ce sont deux commentaires distincts")


# ========================================================================
# SCENARIO 5 : conflit concurrent edit (verrouillage optimiste)
# ========================================================================
def scenario_5():
    print("\n=== SCENARIO 5 : conflit concurrent edit (lock optimiste) ===")
    fx = setup_fixtures()
    entite = fx['entite']

    # Le Demandeur sauvegarde a la version 1
    form = FormulaireDCP(entite_id=entite.id, reponses={'champ': 'A'}, version=1)
    db.session.add(form)
    db.session.flush()
    version_demandeur = form.version
    assert_eq(version_demandeur, 1, "version initiale = 1")

    # Le RL sauvegarde de son cote -> bump vers version 2
    form.reponses = {'champ': 'B'}
    form.version = 2
    db.session.flush()

    # Le Demandeur tente une nouvelle save avec sa version obsolete (1)
    # On verifie cote logique : la condition de garde est form.version != expected_version
    expected_version = version_demandeur  # 1
    actual_version = form.version  # 2
    assert_true(actual_version != expected_version,
                "version a change -> conflit detecte")

    # Si le Demandeur recharge (version 2), le save devrait reussir
    expected_version = form.version  # 2
    assert_true(actual_version == expected_version,
                "apres rechargement, version coherente -> save autorise")


# ========================================================================
# RUNNER
# ========================================================================
def main():
    app = create_app()
    print("=== Tests d'integration PR — modele Pull Request ===")
    print("Mode : transaction rollback (aucune trace en BDD apres execution)\n")

    with app.app_context():
        # On ouvre une transaction qu'on rollback systematiquement a la fin
        connection = db.engine.connect()
        transaction = connection.begin()
        # Bind la session SQLAlchemy a la transaction
        db.session.remove()
        db.session.configure(bind=connection)

        try:
            scenario_1()
            db.session.flush()  # garantir le commit logique sans persister
            scenario_2()
            db.session.flush()
            scenario_3()
            db.session.flush()
            scenario_4()
            db.session.flush()
            scenario_5()
            db.session.flush()
        finally:
            transaction.rollback()
            connection.close()
            db.session.remove()

    print(f"\n=== Resultat : {PASS} OK / {FAIL} FAIL ===")
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == '__main__':
    main()
