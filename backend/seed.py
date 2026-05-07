"""
Seed script pour ARTCI DCP Platform v2.2
Crée les données de test : utilisateurs ARTCI, comptes entreprise, entités avec toutes les sous-tables.

Usage :
    cd backend
    python seed.py          # ne seed que si la base est vide
    python seed.py --force  # réinitialise la base avant de seeder
"""
import sys
import os
from datetime import datetime, timezone, timedelta, date

# Ajouter le répertoire courant au PYTHONPATH
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.utils.password import hash_password, calculate_password_expiry
from app.models import (
    User, CompteEntreprise,
    EntiteBase, EntiteContact, EntiteWorkflow, EntiteLocalisation, EntiteConformite,
    DPO, FinaliteBaseLegale, HistoriqueStatut, AssignationDemande,
    ResponsableLegal, SecuriteConformite, MesureSecurite,
    RegistreTraitement, FeedbackVerification,
    DemandeRapprochement, Renouvellement, Notification,
)
from app.models.documents_joints import DocumentJoint
from app.models.enums import (
    RoleEnum, OrigineSaisieEnum, StatutWorkflowEnum, StatutConformiteEnum,
    TypeDPOEnum, BaseLegaleEnum, StatutAssignationEnum, TypeMesureEnum,
    StatutRapprochementEnum, StatutRenouvellementEnum, TypeDocumentEnum,
)

NOW = datetime.now(timezone.utc)
PWD = 'Test@1234'


def seed():
    env = os.getenv('FLASK_ENV', 'development')
    app = create_app(env)

    with app.app_context():
        # ── Vérification doublons ────────────────────────────────────
        force = '--force' in sys.argv
        if User.query.first():
            if not force:
                print("La base contient déjà des données. Utilisez --force pour réinitialiser.")
                return
            print("Mode --force : réinitialisation de la base...")
            db.drop_all()
            db.create_all()

        print("=== Seed ARTCI DCP Platform ===\n")

        # ── 1. Utilisateurs ARTCI ────────────────────────────────────
        users = [
            User(
                nom='Ouattara', prenom='Ibrahim',
                email='superadmin@artci.ci',
                password_hash=hash_password(PWD),
                role=RoleEnum.super_admin,
                telephone='+225 01 02 03 04 05',
                is_active=True,
            ),
            User(
                nom='Kouassi', prenom='Jean',
                email='admin@artci.ci',
                password_hash=hash_password(PWD),
                role=RoleEnum.admin,
                telephone='+225 07 08 09 10 11',
                is_active=True,
            ),
            User(
                nom='Diarra', prenom='Marie',
                email='editor@artci.ci',
                password_hash=hash_password(PWD),
                role=RoleEnum.editor,
                telephone='+225 05 55 66 77 88',
                is_active=True,
            ),
            User(
                nom='Traoré', prenom='Aïcha',
                email='reader@artci.ci',
                password_hash=hash_password(PWD),
                role=RoleEnum.reader,
                telephone='+225 07 11 22 33 44',
                is_active=True,
            ),
        ]
        db.session.add_all(users)
        db.session.flush()
        super_admin, admin, editor, reader = users
        print(f"[OK] {len(users)} utilisateurs ARTCI créés")

        # ── 2. Comptes Entreprise ────────────────────────────────────
        pwd_expiry = calculate_password_expiry()

        comptes = [
            CompteEntreprise(
                email='entrepriseA@test.ci',
                password_hash=hash_password(PWD),
                denomination='Entreprise A',
                numero_cc='CI-ABJ-2020-B-12345',
                telephone='+225 27 20 00 00 00',
                adresse='Boulevard Lagunaire, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='entrepriseB@test.ci',
                password_hash=hash_password(PWD),
                denomination='Entreprise B',
                numero_cc='CI-ABJ-2019-B-67890',
                telephone='+225 05 00 00 00 00',
                adresse='Rue des Jardins, Cocody',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='entrepriseC@test.ci',
                password_hash=hash_password(PWD),
                denomination='Entreprise C',
                numero_cc='CI-ABJ-2018-B-11111',
                telephone='+225 27 20 31 55 00',
                adresse='Avenue Terrasson de Fougères, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='entrepriseD@test.ci',
                password_hash=hash_password(PWD),
                denomination='Entreprise D',
                numero_cc='CI-ABJ-2017-B-22222',
                telephone='+225 27 20 20 12 34',
                adresse='5 Avenue Joseph Anoma, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
        ]
        db.session.add_all(comptes)
        db.session.flush()
        cA, cB, cC, cD = comptes
        print(f"[OK] {len(comptes)} comptes entreprise créés")

        # ── 3. Entités ───────────────────────────────────────────────
        entites = [
            # --- Auto-recensement (liées aux comptes) ---
            EntiteBase(
                compte_entreprise_id=cA.id,
                numero_cc=cA.numero_cc,
                denomination=cA.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Télécommunications',
                adresse=cA.adresse, ville='Abidjan', region='Abidjan',
                telephone=cA.telephone, email=cA.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=cB.id,
                numero_cc=cB.numero_cc,
                denomination=cB.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Télécommunications',
                adresse=cB.adresse, ville='Abidjan', region='Abidjan',
                telephone=cB.telephone, email=cB.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=cC.id,
                numero_cc=cC.numero_cc,
                denomination=cC.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Banque / Finance',
                adresse=cC.adresse, ville='Abidjan', region='Abidjan',
                telephone=cC.telephone, email=cC.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=cD.id,
                numero_cc=cD.numero_cc,
                denomination=cD.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Banque / Finance',
                adresse=cD.adresse, ville='Abidjan', region='Abidjan',
                telephone=cD.telephone, email=cD.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=False,
            ),
            # --- Saisie ARTCI ---
            EntiteBase(
                numero_cc='CI-BKE-2021-A-33333',
                denomination='Entreprise E',
                forme_juridique='SARL',
                secteur_activite='Santé',
                adresse='Quartier Commerce, rue Principale',
                ville='Bouaké', region='Vallée du Bandama',
                telephone='+225 27 31 63 10 00',
                email='entrepriseE@test.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
            EntiteBase(
                numero_cc='CI-YAM-2022-C-44444',
                denomination='Entreprise F',
                forme_juridique='SARL',
                secteur_activite='Commerce',
                adresse='Avenue Principale',
                ville='Yamoussoukro', region='Yamoussoukro',
                telephone='+225 27 30 64 50 00',
                email='entrepriseF@test.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
            EntiteBase(
                numero_cc='CI-SPE-2023-D-55555',
                denomination='Entreprise G',
                forme_juridique='Entreprise Individuelle',
                secteur_activite='Transport',
                adresse='Zone Portuaire, Boulevard Maritime',
                ville='San-Pédro', region='Bas-Sassandra',
                telephone='+225 27 34 71 20 00',
                email='entrepriseG@test.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=False,
            ),
            EntiteBase(
                numero_cc='CI-ABJ-2023-E-66666',
                denomination='Entreprise H',
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Assurance',
                adresse='Immeuble Alliance, Boulevard de la République',
                ville='Abidjan', region='Abidjan',
                telephone='+225 27 20 25 80 00',
                email='entrepriseH@test.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=False,
            ),
            # --- Administrations publiques (avec décret de création) ---
            EntiteBase(
                numero_cc='CI-ADM-2024-PUB-001',
                denomination='Administration I',
                forme_juridique='Administration publique',
                secteur_activite='Services',
                adresse='Plateau, Tour C Administrative',
                ville='Abidjan', region='Abidjan',
                telephone='+225 27 20 22 00 00',
                email='adminI@test.ci',
                decret_creation='Décret n°2021-297 du 09 juin 2021',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
            EntiteBase(
                numero_cc='CI-ADM-2024-PUB-002',
                denomination='Établissement public J',
                forme_juridique='Établissement public',
                secteur_activite='Services',
                adresse='Avenue du Général de Gaulle, Plateau',
                ville='Abidjan', region='Abidjan',
                telephone='+225 27 20 25 45 00',
                email='etablissementJ@test.ci',
                decret_creation='Décret n°2000-487 du 12 juillet 2000',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
        ]
        db.session.add_all(entites)
        db.session.flush()
        eA, eB, eC, eD, eE, eF, eG, eH, eI, eJ = entites
        print(f"[OK] {len(entites)} entités créées")

        # ── 4. Workflows ─────────────────────────────────────────────
        workflows = [
            EntiteWorkflow(
                entite_id=eA.id, statut=StatutWorkflowEnum.publie,
                numero_autorisation_artci='ART-2024-001',
                date_soumission=NOW - timedelta(days=60),
                date_validation=NOW - timedelta(days=30),
                date_publication=NOW - timedelta(days=10),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eB.id, statut=StatutWorkflowEnum.en_verification,
                date_soumission=NOW - timedelta(days=15),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eC.id, statut=StatutWorkflowEnum.valide,
                numero_autorisation_artci='ART-2024-002',
                date_soumission=NOW - timedelta(days=45),
                date_validation=NOW - timedelta(days=20),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eD.id, statut=StatutWorkflowEnum.soumis,
                date_soumission=NOW - timedelta(days=5),
            ),
            EntiteWorkflow(
                entite_id=eE.id, statut=StatutWorkflowEnum.conforme,
                date_soumission=NOW - timedelta(days=40),
                date_validation=NOW - timedelta(days=25),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eF.id, statut=StatutWorkflowEnum.en_attente_complements,
                date_soumission=NOW - timedelta(days=20),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eG.id, statut=StatutWorkflowEnum.rejete,
                date_soumission=NOW - timedelta(days=30),
                date_rejet=NOW - timedelta(days=12),
                motif_rejet='Dossier incomplet : documents manquants.',
                createdBy=admin.id,
            ),
            EntiteWorkflow(
                entite_id=eH.id, statut=StatutWorkflowEnum.brouillon_artci,
                createdBy=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eI.id, statut=StatutWorkflowEnum.publie,
                numero_autorisation_artci='ART-2024-003',
                date_soumission=NOW - timedelta(days=90),
                date_validation=NOW - timedelta(days=60),
                date_publication=NOW - timedelta(days=50),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            EntiteWorkflow(
                entite_id=eJ.id, statut=StatutWorkflowEnum.publie,
                numero_autorisation_artci='ART-2024-004',
                date_soumission=NOW - timedelta(days=80),
                date_validation=NOW - timedelta(days=55),
                date_publication=NOW - timedelta(days=45),
                createdBy=admin.id, assignedTo=editor.id,
            ),
        ]
        db.session.add_all(workflows)
        db.session.flush()
        print(f"[OK] {len(workflows)} workflows créés")

        # ── 4b. Documents joints (autorisations PDF de test) ────────
        upload_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'autorisations')
        os.makedirs(upload_dir, exist_ok=True)

        def create_test_pdf(filename, titre):
            filepath = os.path.join(upload_dir, filename)
            if not os.path.exists(filepath):
                content = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 16 Tf
50 700 Td
({titre}) Tj
0 -30 Td
/F1 12 Tf
(Document de test - ARTCI DCP Platform) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF"""
                with open(filepath, 'w') as f:
                    f.write(content)
            return filepath

        create_test_pdf('autorisation_A.pdf', 'Autorisation ART-2024-001 - Entreprise A')
        create_test_pdf('autorisation_C.pdf', 'Autorisation ART-2024-002 - Entreprise C')
        create_test_pdf('autorisation_I.pdf', 'Autorisation ART-2024-003 - Administration I')
        create_test_pdf('autorisation_J.pdf', 'Autorisation ART-2024-004 - Etablissement J')

        documents = [
            DocumentJoint(
                entite_id=eA.id, type_document=TypeDocumentEnum.autorisation,
                nom_fichier='autorisation_A.pdf',
                chemin_fichier='autorisations/autorisation_A.pdf',
                taille=1024, mime_type='application/pdf',
            ),
            DocumentJoint(
                entite_id=eC.id, type_document=TypeDocumentEnum.autorisation,
                nom_fichier='autorisation_C.pdf',
                chemin_fichier='autorisations/autorisation_C.pdf',
                taille=1024, mime_type='application/pdf',
            ),
            DocumentJoint(
                entite_id=eI.id, type_document=TypeDocumentEnum.autorisation,
                nom_fichier='autorisation_I.pdf',
                chemin_fichier='autorisations/autorisation_I.pdf',
                taille=1024, mime_type='application/pdf',
            ),
            DocumentJoint(
                entite_id=eJ.id, type_document=TypeDocumentEnum.autorisation,
                nom_fichier='autorisation_J.pdf',
                chemin_fichier='autorisations/autorisation_J.pdf',
                taille=1024, mime_type='application/pdf',
            ),
        ]
        db.session.add_all(documents)
        db.session.flush()
        print(f"[OK] {len(documents)} documents d'autorisation créés")

        # ── 5. Contacts ──────────────────────────────────────────────
        contacts = [
            EntiteContact(entite_id=eA.id, responsable_legal_nom='Koné Alassane',
                          responsable_legal_fonction='Directeur Général',
                          responsable_legal_email='dg@entrepriseA.ci',
                          responsable_legal_telephone='+225 27 20 00 00 01',
                          site_web='https://www.entrepriseA.ci'),
            EntiteContact(entite_id=eB.id, responsable_legal_nom='Bamba Moussa',
                          responsable_legal_fonction='CEO',
                          responsable_legal_email='ceo@entrepriseB.ci',
                          responsable_legal_telephone='+225 05 00 00 00 01',
                          site_web='https://www.entrepriseB.ci'),
            EntiteContact(entite_id=eC.id, responsable_legal_nom='Dosso Kadiatou',
                          responsable_legal_fonction='Directrice Générale',
                          responsable_legal_email='dg@entrepriseC.ci',
                          responsable_legal_telephone='+225 27 20 31 55 01'),
            EntiteContact(entite_id=eD.id, responsable_legal_nom='Yapi Claude',
                          responsable_legal_fonction='Directeur Général',
                          responsable_legal_email='dg@entrepriseD.ci'),
            EntiteContact(entite_id=eE.id, responsable_legal_nom='Dr. Konan Eugène',
                          responsable_legal_fonction='Médecin Directeur',
                          responsable_legal_email='direction@entrepriseE.ci'),
            EntiteContact(entite_id=eF.id, responsable_legal_nom='Touré Mamadou',
                          responsable_legal_fonction='Gérant',
                          responsable_legal_email='gerant@entrepriseF.ci'),
            EntiteContact(entite_id=eG.id, responsable_legal_nom='Coulibaly Sékou',
                          responsable_legal_fonction='Directeur',
                          responsable_legal_email='direction@entrepriseG.ci'),
            EntiteContact(entite_id=eH.id, responsable_legal_nom='Gnéba Patricia',
                          responsable_legal_fonction='PDG',
                          responsable_legal_email='pdg@entrepriseH.ci'),
        ]
        db.session.add_all(contacts)
        db.session.flush()
        print(f"[OK] {len(contacts)} contacts créés")

        # ── 6. Conformité ────────────────────────────────────────────
        conformites = [
            EntiteConformite(entite_id=eA.id, score_conformite=92,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='1000+', volume_donnees_traitees='10 millions+'),
            EntiteConformite(entite_id=eB.id, score_conformite=68,
                             statut_conformite=StatutConformiteEnum.non_conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.externe,
                             effectif_entreprise='500-1000', volume_donnees_traitees='5-10 millions'),
            EntiteConformite(entite_id=eC.id, score_conformite=85,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='200-500', volume_donnees_traitees='1-5 millions'),
            EntiteConformite(entite_id=eD.id, score_conformite=55,
                             statut_conformite=StatutConformiteEnum.non_conforme,
                             a_dpo=False,
                             effectif_entreprise='200-500', volume_donnees_traitees='1-5 millions'),
            EntiteConformite(entite_id=eE.id, score_conformite=78,
                             statut_conformite=StatutConformiteEnum.partiellement_conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.externe,
                             effectif_entreprise='50-200', volume_donnees_traitees='100 000-500 000'),
            EntiteConformite(entite_id=eF.id, score_conformite=40,
                             statut_conformite=StatutConformiteEnum.non_conforme,
                             a_dpo=False,
                             effectif_entreprise='10-50', volume_donnees_traitees='10 000-100 000'),
            EntiteConformite(entite_id=eG.id, score_conformite=30,
                             statut_conformite=StatutConformiteEnum.non_conforme,
                             a_dpo=False,
                             effectif_entreprise='10-50', volume_donnees_traitees='< 10 000'),
            EntiteConformite(entite_id=eH.id, score_conformite=72,
                             statut_conformite=StatutConformiteEnum.partiellement_conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='200-500', volume_donnees_traitees='500 000-1 million'),
            EntiteConformite(entite_id=eI.id, score_conformite=88,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='500-1000', volume_donnees_traitees='1-5 millions'),
            EntiteConformite(entite_id=eJ.id, score_conformite=82,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.externe,
                             effectif_entreprise='1000+', volume_donnees_traitees='5-10 millions'),
        ]
        db.session.add_all(conformites)
        db.session.flush()
        print(f"[OK] {len(conformites)} conformités créées")

        # ── 7. Localisations (GPS Côte d'Ivoire) ────────────────────
        localisations = [
            EntiteLocalisation(entite_id=eA.id,
                               latitude=5.3220, longitude=-4.0165,
                               adresse_complete='Boulevard Lagunaire, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=eB.id,
                               latitude=5.3498, longitude=-3.9860,
                               adresse_complete='Rue des Jardins, Cocody, Abidjan',
                               precision_gps='15m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=eC.id,
                               latitude=5.3180, longitude=-4.0210,
                               adresse_complete='Avenue Terrasson de Fougères, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=eE.id,
                               latitude=7.6936, longitude=-5.0308,
                               adresse_complete='Quartier Commerce, Bouaké',
                               precision_gps='50m', methode_geolocalisation='Adresse'),
            EntiteLocalisation(entite_id=eF.id,
                               latitude=6.8276, longitude=-5.2893,
                               adresse_complete='Avenue Principale, Yamoussoukro',
                               precision_gps='30m', methode_geolocalisation='Adresse'),
            EntiteLocalisation(entite_id=eI.id,
                               latitude=5.3195, longitude=-4.0188,
                               adresse_complete='Tour C Administrative, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=eJ.id,
                               latitude=5.3160, longitude=-4.0230,
                               adresse_complete='Avenue du Général de Gaulle, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
        ]
        db.session.add_all(localisations)
        db.session.flush()
        print(f"[OK] {len(localisations)} localisations GPS créées")

        # ── 8. DPO ───────────────────────────────────────────────────
        dpos = [
            DPO(entite_id=eA.id, nom='Yao', prenom='Christelle',
                email='dpo@entrepriseA.ci', telephone='+225 27 20 00 00 10',
                type=TypeDPOEnum.interne, date_designation=date(2023, 1, 15)),
            DPO(entite_id=eB.id, nom='Konaté', prenom='Abdoulaye',
                email='dpo@consulting-test.ci', telephone='+225 07 12 34 56 78',
                type=TypeDPOEnum.externe, organisme='Cabinet Consulting Test',
                date_designation=date(2023, 6, 20)),
            DPO(entite_id=eC.id, nom='Aké', prenom='Sophie',
                email='dpo@entrepriseC.ci', telephone='+225 27 20 31 55 10',
                type=TypeDPOEnum.interne, date_designation=date(2022, 9, 1)),
            DPO(entite_id=eE.id, nom='Diallo', prenom='Fatoumata',
                email='dpo@cabinet-test.ci', telephone='+225 07 99 88 77 66',
                type=TypeDPOEnum.externe, organisme='Cabinet Test & Associés',
                date_designation=date(2024, 3, 10)),
        ]
        db.session.add_all(dpos)
        db.session.flush()
        print(f"[OK] {len(dpos)} DPO créés")

        # ── 9. Responsables légaux ───────────────────────────────────
        responsables = [
            ResponsableLegal(entite_id=eA.id, nom='Koné', prenom='Alassane',
                             fonction='Directeur Général', email='dg@entrepriseA.ci',
                             telephone='+225 27 20 00 00 01'),
            ResponsableLegal(entite_id=eA.id, nom='Touré', prenom='Aminata',
                             fonction='Directrice Juridique', email='juridique@entrepriseA.ci'),
            ResponsableLegal(entite_id=eB.id, nom='Bamba', prenom='Moussa',
                             fonction='CEO', email='ceo@entrepriseB.ci'),
            ResponsableLegal(entite_id=eC.id, nom='Dosso', prenom='Kadiatou',
                             fonction='Directrice Générale', email='dg@entrepriseC.ci'),
            ResponsableLegal(entite_id=eE.id, nom='Konan', prenom='Eugène',
                             fonction='Médecin Directeur', email='direction@entrepriseE.ci'),
            ResponsableLegal(entite_id=eH.id, nom='Gnéba', prenom='Patricia',
                             fonction='PDG', email='pdg@entrepriseH.ci'),
        ]
        db.session.add_all(responsables)
        db.session.flush()
        print(f"[OK] {len(responsables)} responsables légaux créés")

        # ── 10. Finalités & bases légales ────────────────────────────
        finalites = [
            FinaliteBaseLegale(entite_id=eA.id,
                               finalite='Gestion des clients et facturation',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=40,
                               description="Traitement nécessaire à l'exécution du contrat de service"),
            FinaliteBaseLegale(entite_id=eA.id,
                               finalite='Marketing et communication ciblée',
                               base_legale=BaseLegaleEnum.consentement, pourcentage=30,
                               description="Envoi d'offres personnalisées avec consentement"),
            FinaliteBaseLegale(entite_id=eA.id,
                               finalite='Obligations réglementaires',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=30,
                               description="Conservation des données de trafic"),
            FinaliteBaseLegale(entite_id=eB.id,
                               finalite='Gestion des abonnés',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=50),
            FinaliteBaseLegale(entite_id=eB.id,
                               finalite='Services financiers mobiles',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=50),
            FinaliteBaseLegale(entite_id=eC.id,
                               finalite='Gestion des comptes bancaires',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=60),
            FinaliteBaseLegale(entite_id=eC.id,
                               finalite='Lutte anti-blanchiment (LAB/FT)',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=40),
            FinaliteBaseLegale(entite_id=eE.id,
                               finalite='Gestion des dossiers médicaux',
                               base_legale=BaseLegaleEnum.interet_vital, pourcentage=100,
                               description='Traitement de données de santé pour soins médicaux'),
        ]
        db.session.add_all(finalites)
        db.session.flush()
        print(f"[OK] {len(finalites)} finalités créées")

        # ── 11. Sécurité & conformité ────────────────────────────────
        securites = [
            SecuriteConformite(entite_id=eA.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=True, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Trimestrielle',
                               dernier_audit=date(2024, 6, 15)),
            SecuriteConformite(entite_id=eB.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=False, notification_violations=True,
                               nombre_violations_12mois=1, formation_personnel=True,
                               frequence_formation='Semestrielle',
                               dernier_audit=date(2024, 3, 20)),
            SecuriteConformite(entite_id=eC.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=True, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Annuelle',
                               dernier_audit=date(2024, 1, 10)),
            SecuriteConformite(entite_id=eE.id, politique_securite=True,
                               responsable_securite=False, analyse_risques=False,
                               plan_continuite=False, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Annuelle'),
        ]
        db.session.add_all(securites)
        db.session.flush()
        print(f"[OK] {len(securites)} sécurité-conformité créées")

        # ── 12. Mesures de sécurité ──────────────────────────────────
        mesures = [
            MesureSecurite(entite_id=eA.id, type_mesure=TypeMesureEnum.technique,
                           description='Chiffrement AES-256 des données au repos et en transit',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 1, 1)),
            MesureSecurite(entite_id=eA.id, type_mesure=TypeMesureEnum.organisationnelle,
                           description='Politique de gestion des accès (RBAC) et revue trimestrielle',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 3, 15)),
            MesureSecurite(entite_id=eA.id, type_mesure=TypeMesureEnum.physique,
                           description='Datacenter Tier III avec contrôle biométrique',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2022, 6, 1)),
            MesureSecurite(entite_id=eB.id, type_mesure=TypeMesureEnum.technique,
                           description='Pare-feu nouvelle génération et SOC 24/7',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 9, 1)),
            MesureSecurite(entite_id=eC.id, type_mesure=TypeMesureEnum.technique,
                           description='Tokenisation des données bancaires (PCI-DSS)',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2022, 12, 1)),
            MesureSecurite(entite_id=eC.id, type_mesure=TypeMesureEnum.organisationnelle,
                           description='Comité de sécurité mensuel et plan de réponse aux incidents',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 2, 1)),
        ]
        db.session.add_all(mesures)
        db.session.flush()
        print(f"[OK] {len(mesures)} mesures de sécurité créées")

        # ── 13. Registre de traitements ──────────────────────────────
        registres = [
            RegistreTraitement(entite_id=eA.id,
                               nom_traitement='Gestion clientèle',
                               description='Collecte et traitement des données des abonnés',
                               finalite='Fourniture de services',
                               base_legale='Contrat de service',
                               categories_personnes='Clients, prospects',
                               duree_conservation='5 ans après fin de contrat',
                               destinataires='Service commercial, service technique',
                               transfert_hors_ci=False),
            RegistreTraitement(entite_id=eA.id,
                               nom_traitement='Paiement mobile',
                               description='Service de paiement mobile',
                               finalite='Services financiers mobiles',
                               base_legale='Obligation légale (réglementation BCEAO)',
                               categories_personnes='Utilisateurs du service de paiement',
                               duree_conservation='10 ans (obligation comptable)',
                               transfert_hors_ci=True),
            RegistreTraitement(entite_id=eC.id,
                               nom_traitement='Gestion des comptes courants',
                               description='Ouverture et gestion des comptes bancaires',
                               finalite='Services bancaires',
                               base_legale='Contrat + obligation légale',
                               categories_personnes='Clients particuliers et entreprises',
                               duree_conservation='10 ans après clôture',
                               transfert_hors_ci=False),
            RegistreTraitement(entite_id=eE.id,
                               nom_traitement='Dossiers médicaux patients',
                               description='Gestion des dossiers médicaux électroniques',
                               finalite='Soins médicaux et suivi patient',
                               base_legale='Intérêt vital du patient',
                               categories_personnes='Patients',
                               duree_conservation='20 ans (obligation santé)',
                               transfert_hors_ci=False),
        ]
        db.session.add_all(registres)
        db.session.flush()
        print(f"[OK] {len(registres)} registres de traitements créés")

        # ── 14. Historique des statuts ────────────────────────────────
        historiques = [
            HistoriqueStatut(entite_id=eA.id, ancien_statut='brouillon',
                             nouveau_statut='soumis',
                             modifie_par=None, commentaire='Soumission initiale'),
            HistoriqueStatut(entite_id=eA.id, ancien_statut='soumis',
                             nouveau_statut='en_verification',
                             modifie_par=admin.id, commentaire='Assigné pour vérification'),
            HistoriqueStatut(entite_id=eA.id, ancien_statut='en_verification',
                             nouveau_statut='valide',
                             modifie_par=admin.id, commentaire='Validation complète du dossier'),
            HistoriqueStatut(entite_id=eA.id, ancien_statut='valide',
                             nouveau_statut='publie',
                             modifie_par=super_admin.id, commentaire='Publication sur la carte'),
            HistoriqueStatut(entite_id=eB.id, ancien_statut='brouillon',
                             nouveau_statut='soumis',
                             modifie_par=None, commentaire='Soumission initiale'),
            HistoriqueStatut(entite_id=eB.id, ancien_statut='soumis',
                             nouveau_statut='en_verification',
                             modifie_par=admin.id, commentaire='Prise en charge pour vérification'),
            HistoriqueStatut(entite_id=eC.id, ancien_statut='soumis',
                             nouveau_statut='valide',
                             modifie_par=admin.id, commentaire='Validation après vérification'),
            HistoriqueStatut(entite_id=eG.id, ancien_statut='soumis',
                             nouveau_statut='rejete',
                             modifie_par=admin.id,
                             commentaire='Dossier incomplet : documents manquants'),
            HistoriqueStatut(entite_id=eF.id, ancien_statut='soumis',
                             nouveau_statut='en_attente_complements',
                             modifie_par=editor.id,
                             commentaire='Informations complémentaires demandées sur le DPO'),
            HistoriqueStatut(entite_id=eE.id, ancien_statut='en_verification',
                             nouveau_statut='conforme',
                             modifie_par=admin.id,
                             commentaire='Dossier conforme'),
        ]
        db.session.add_all(historiques)
        db.session.flush()
        print(f"[OK] {len(historiques)} historiques de statuts créés")

        # ── 15. Assignations ─────────────────────────────────────────
        assignations = [
            AssignationDemande(
                entite_id=eB.id, agent_id=editor.id,
                echeance=(NOW + timedelta(days=7)).date(),
                statut=StatutAssignationEnum.en_cours,
            ),
            AssignationDemande(
                entite_id=eF.id, agent_id=editor.id,
                echeance=(NOW + timedelta(days=14)).date(),
                statut=StatutAssignationEnum.en_cours,
            ),
            AssignationDemande(
                entite_id=eA.id, agent_id=editor.id,
                echeance=(NOW - timedelta(days=5)).date(),
                statut=StatutAssignationEnum.valide,
                traite_le=NOW - timedelta(days=15),
                valide_par=admin.id,
                valide_le=NOW - timedelta(days=10),
            ),
        ]
        db.session.add_all(assignations)
        db.session.flush()
        print(f"[OK] {len(assignations)} assignations créées")

        # ── 16. Feedbacks ────────────────────────────────────────────
        feedbacks = [
            FeedbackVerification(
                entite_id=eF.id, agent_id=editor.id,
                commentaires='Le dossier nécessite des compléments sur la désignation du DPO.',
                elements_manquants=['Désignation DPO', 'Politique de sécurité', 'Registre des traitements'],
                delai_fourniture=date.today() + timedelta(days=15),
            ),
            FeedbackVerification(
                entite_id=eB.id, agent_id=editor.id,
                commentaires='Bon dossier, quelques précisions à apporter sur les transferts internationaux.',
                elements_manquants=['Détail des transferts hors CI'],
            ),
        ]
        db.session.add_all(feedbacks)
        db.session.flush()
        print(f"[OK] {len(feedbacks)} feedbacks créés")

        # ── 17. Demandes de rapprochement ──────────────────────────
        rapprochements = [
            DemandeRapprochement(
                entite_id=eG.id,
                compte_entreprise_id=cA.id,
                email_demandeur=cA.email,
                numero_cc=eG.numero_cc,
                raison_demande='Cette entité correspond à notre filiale. Nous souhaitons rapprocher ce dossier.',
                statut=StatutRapprochementEnum.en_attente,
            ),
            DemandeRapprochement(
                entite_id=eE.id,
                compte_entreprise_id=cC.id,
                email_demandeur=cC.email,
                numero_cc=eE.numero_cc,
                raison_demande='Erreur lors de la saisie initiale.',
                statut=StatutRapprochementEnum.rejete,
                traite_par=admin.id,
                date_traitement=NOW - timedelta(days=3),
                commentaire_artci='Demande rejetée : aucun lien juridique établi.',
            ),
        ]
        db.session.add_all(rapprochements)
        db.session.flush()
        print(f"[OK] {len(rapprochements)} demandes de rapprochement créées")

        # ── 18. Renouvellements ────────────────────────────────────
        renouvellements = [
            Renouvellement(
                entite_id=eA.id,
                date_expiration_agrement=date.today() + timedelta(days=120),
                motif='Renouvellement annuel.',
                statut=StatutRenouvellementEnum.en_attente,
            ),
            Renouvellement(
                entite_id=eC.id,
                date_expiration_agrement=date.today() + timedelta(days=25),
                motif='Expiration proche, demande anticipée.',
                statut=StatutRenouvellementEnum.approuve,
                traite_par=admin.id,
                date_traitement=NOW - timedelta(days=5),
                commentaire='Renouvellement approuvé pour 1 an.',
            ),
        ]
        db.session.add_all(renouvellements)
        db.session.flush()
        print(f"[OK] {len(renouvellements)} renouvellements créés")

        # ── 19. Notifications ──────────────────────────────────────
        notifications = [
            Notification(
                destinataire_type='artci', destinataire_id=admin.id,
                type='nouvelle_demande',
                titre='Nouvelle demande soumise',
                message=f'{cD.denomination} a soumis une demande de déclaration.',
                lue=False, entite_id=eD.id,
            ),
            Notification(
                destinataire_type='artci', destinataire_id=editor.id,
                type='echeance',
                titre='Échéance de traitement proche',
                message=f'L\'assignation pour {cB.denomination} arrive à échéance dans 3 jours.',
                lue=False, entite_id=eB.id,
            ),
            Notification(
                destinataire_type='entreprise', destinataire_id=cA.id,
                type='validation',
                titre='Dossier publié',
                message='Votre dossier a été validé et publié sur la carte.',
                lue=True, entite_id=eA.id,
            ),
            Notification(
                destinataire_type='artci', destinataire_id=admin.id,
                type='rapprochement',
                titre='Demande de rapprochement',
                message=f'{cA.denomination} a soumis une demande de rapprochement pour {eG.denomination}.',
                lue=False, entite_id=eG.id,
            ),
            Notification(
                destinataire_type='entreprise', destinataire_id=cB.id,
                type='renouvellement',
                titre='Renouvellement à prévoir',
                message='Votre agrément expire dans 90 jours.',
                lue=False, entite_id=eB.id,
            ),
        ]
        db.session.add_all(notifications)
        db.session.flush()
        print(f"[OK] {len(notifications)} notifications créées")

        # ── COMMIT FINAL ─────────────────────────────────────────────
        db.session.commit()

        print("\n" + "=" * 55)
        print("  SEED TERMINE AVEC SUCCES !")
        print("=" * 55)
        print(f"\n  Utilisateurs ARTCI  : {User.query.count()}")
        print(f"  Comptes entreprise  : {CompteEntreprise.query.count()}")
        print(f"  Entités             : {EntiteBase.query.count()}")
        print(f"  Rapprochements      : {DemandeRapprochement.query.count()}")
        print(f"  Renouvellements     : {Renouvellement.query.count()}")
        print(f"  Notifications       : {Notification.query.count()}")
        print()
        print("  === Credentials de test ===")
        print(f"  Mot de passe unique : {PWD}")
        print()
        print("  ARTCI Staff :")
        print("  +-------------------------+-------------+")
        print("  | Email                   | Rôle        |")
        print("  +-------------------------+-------------+")
        print("  | superadmin@artci.ci     | super_admin |")
        print("  | admin@artci.ci          | admin       |")
        print("  | editor@artci.ci         | editor      |")
        print("  | reader@artci.ci         | reader      |")
        print("  +-------------------------+-------------+")
        print()
        print("  Entreprises :")
        print("  +-------------------------+------------------------+")
        print("  | Email                   | Dénomination           |")
        print("  +-------------------------+------------------------+")
        print("  | entrepriseA@test.ci     | Entreprise A           |")
        print("  | entrepriseB@test.ci     | Entreprise B           |")
        print("  | entrepriseC@test.ci     | Entreprise C           |")
        print("  | entrepriseD@test.ci     | Entreprise D           |")
        print("  +-------------------------+------------------------+")
        print()


if __name__ == '__main__':
    seed()
