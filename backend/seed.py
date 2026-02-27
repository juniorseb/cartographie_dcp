"""
Seed script pour ARTCI DCP Platform v2.2
Crée les données de test : utilisateurs ARTCI, comptes entreprise, entités avec toutes les sous-tables.

Usage :
    cd backend
    python seed.py
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
from app.models.enums import (
    RoleEnum, OrigineSaisieEnum, StatutWorkflowEnum, StatutConformiteEnum,
    TypeDPOEnum, BaseLegaleEnum, StatutAssignationEnum, TypeMesureEnum,
    StatutRapprochementEnum, StatutRenouvellementEnum,
)

NOW = datetime.now(timezone.utc)


def seed():
    app = create_app('development')

    with app.app_context():
        # ── Vérification doublons ────────────────────────────────────
        if User.query.first():
            print("La base contient déjà des données. Abandon.")
            print("Pour re-seeder, videz la base d'abord (flask db downgrade base && flask db upgrade).")
            sys.exit(1)

        print("=== Seed ARTCI DCP Platform ===\n")

        # ── 1. Utilisateurs ARTCI ────────────────────────────────────
        users = [
            User(
                nom='Ouattara', prenom='Ibrahim',
                email='superadmin@artci.ci',
                password_hash=hash_password('SuperAdmin123!'),
                role=RoleEnum.super_admin,
                telephone='+225 01 02 03 04 05',
                is_active=True,
            ),
            User(
                nom='Kouassi', prenom='Jean',
                email='admin@artci.ci',
                password_hash=hash_password('Admin123!'),
                role=RoleEnum.admin,
                telephone='+225 07 08 09 10 11',
                is_active=True,
            ),
            User(
                nom='Diarra', prenom='Marie',
                email='editor@artci.ci',
                password_hash=hash_password('Editor123!'),
                role=RoleEnum.editor,
                telephone='+225 05 55 66 77 88',
                is_active=True,
            ),
            User(
                nom='Traoré', prenom='Aïcha',
                email='reader@artci.ci',
                password_hash=hash_password('Reader123!'),
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
                email='contact@orangeci.com',
                password_hash=hash_password('Orange123!'),
                denomination="Orange Côte d'Ivoire",
                numero_cc='CI-ABJ-2020-B-12345',
                telephone='+225 27 20 00 00 00',
                adresse='Boulevard Lagunaire, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='info@mtn.ci',
                password_hash=hash_password('Mtn123!'),
                denomination="MTN Côte d'Ivoire",
                numero_cc='CI-ABJ-2019-B-67890',
                telephone='+225 05 00 00 00 00',
                adresse='Rue des Jardins, Cocody',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='contact@nsia.ci',
                password_hash=hash_password('Nsia123!'),
                denomination='NSIA Banque CI',
                numero_cc='CI-ABJ-2018-B-11111',
                telephone='+225 27 20 31 55 00',
                adresse='Avenue Terrasson de Fougères, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
            ),
            CompteEntreprise(
                email='contact@sgci.ci',
                password_hash=hash_password('Sgci123!'),
                denomination='Société Générale CI',
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
        orange, mtn, nsia, sgci = comptes
        print(f"[OK] {len(comptes)} comptes entreprise créés")

        # ── 3. Entités ───────────────────────────────────────────────
        # 4 auto_recensement (liées aux comptes) + 4 saisie_artci
        entites = [
            # --- Auto-recensement ---
            EntiteBase(
                compte_entreprise_id=orange.id,
                numero_cc=orange.numero_cc,
                denomination=orange.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Télécommunications',
                adresse=orange.adresse, ville='Abidjan', region='Abidjan',
                telephone=orange.telephone, email=orange.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=mtn.id,
                numero_cc=mtn.numero_cc,
                denomination=mtn.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Télécommunications',
                adresse=mtn.adresse, ville='Abidjan', region='Abidjan',
                telephone=mtn.telephone, email=mtn.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=nsia.id,
                numero_cc=nsia.numero_cc,
                denomination=nsia.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Banque / Finance',
                adresse=nsia.adresse, ville='Abidjan', region='Abidjan',
                telephone=nsia.telephone, email=nsia.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=True,
            ),
            EntiteBase(
                compte_entreprise_id=sgci.id,
                numero_cc=sgci.numero_cc,
                denomination=sgci.denomination,
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Banque / Finance',
                adresse=sgci.adresse, ville='Abidjan', region='Abidjan',
                telephone=sgci.telephone, email=sgci.email,
                origine_saisie=OrigineSaisieEnum.auto_recensement,
                publie_sur_carte=False,
            ),
            # --- Saisie ARTCI ---
            EntiteBase(
                numero_cc='CI-BKE-2021-A-33333',
                denomination='Clinique Internationale de Bouaké',
                forme_juridique='SARL',
                secteur_activite='Santé',
                adresse='Quartier Commerce, rue de l\'Hôpital',
                ville='Bouaké', region='Vallée du Bandama',
                telephone='+225 27 31 63 10 00',
                email='contact@clinique-bouake.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
            EntiteBase(
                numero_cc='CI-YAM-2022-C-44444',
                denomination='Supermarché Bon Prix Yamoussoukro',
                forme_juridique='SARL',
                secteur_activite='Commerce',
                adresse='Avenue Houphouët-Boigny',
                ville='Yamoussoukro', region='Yamoussoukro',
                telephone='+225 27 30 64 50 00',
                email='contact@bonprix-yam.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=True,
            ),
            EntiteBase(
                numero_cc='CI-SPE-2023-D-55555',
                denomination='Transport Express San-Pédro',
                forme_juridique='Entreprise Individuelle',
                secteur_activite='Transport',
                adresse='Zone Portuaire, Boulevard Maritime',
                ville='San-Pédro', region='Bas-Sassandra',
                telephone='+225 27 34 71 20 00',
                email='info@transport-sanpedro.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=False,
            ),
            EntiteBase(
                numero_cc='CI-ABJ-2023-E-66666',
                denomination='Assurance Vie Abidjan',
                forme_juridique='Société Anonyme (SA)',
                secteur_activite='Assurance',
                adresse='Immeuble Alliance, Boulevard de la République',
                ville='Abidjan', region='Abidjan',
                telephone='+225 27 20 25 80 00',
                email='contact@ava-assurance.ci',
                origine_saisie=OrigineSaisieEnum.saisie_artci,
                publie_sur_carte=False,
            ),
        ]
        db.session.add_all(entites)
        db.session.flush()
        e_orange, e_mtn, e_nsia, e_sgci, e_clinique, e_supermarche, e_transport, e_assurance = entites
        print(f"[OK] {len(entites)} entités créées")

        # ── 4. Workflows ─────────────────────────────────────────────
        workflows = [
            # Orange : publie (complet)
            EntiteWorkflow(
                entite_id=e_orange.id,
                statut=StatutWorkflowEnum.publie,
                numero_autorisation_artci='ART-2024-001',
                date_soumission=NOW - timedelta(days=60),
                date_validation=NOW - timedelta(days=30),
                date_publication=NOW - timedelta(days=10),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            # MTN : en_verification
            EntiteWorkflow(
                entite_id=e_mtn.id,
                statut=StatutWorkflowEnum.en_verification,
                date_soumission=NOW - timedelta(days=15),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            # NSIA : valide
            EntiteWorkflow(
                entite_id=e_nsia.id,
                statut=StatutWorkflowEnum.valide,
                numero_autorisation_artci='ART-2024-002',
                date_soumission=NOW - timedelta(days=45),
                date_validation=NOW - timedelta(days=20),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            # SGCI : soumis
            EntiteWorkflow(
                entite_id=e_sgci.id,
                statut=StatutWorkflowEnum.soumis,
                date_soumission=NOW - timedelta(days=5),
            ),
            # Clinique : conforme
            EntiteWorkflow(
                entite_id=e_clinique.id,
                statut=StatutWorkflowEnum.conforme,
                date_soumission=NOW - timedelta(days=40),
                date_validation=NOW - timedelta(days=25),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            # Supermarché : en_attente_complements
            EntiteWorkflow(
                entite_id=e_supermarche.id,
                statut=StatutWorkflowEnum.en_attente_complements,
                date_soumission=NOW - timedelta(days=20),
                createdBy=admin.id, assignedTo=editor.id,
            ),
            # Transport : rejete
            EntiteWorkflow(
                entite_id=e_transport.id,
                statut=StatutWorkflowEnum.rejete,
                date_soumission=NOW - timedelta(days=30),
                date_rejet=NOW - timedelta(days=12),
                motif_rejet='Dossier incomplet : documents manquants (registre de commerce, attestation fiscale).',
                createdBy=admin.id,
            ),
            # Assurance : brouillon_artci
            EntiteWorkflow(
                entite_id=e_assurance.id,
                statut=StatutWorkflowEnum.brouillon_artci,
                createdBy=editor.id,
            ),
        ]
        db.session.add_all(workflows)
        db.session.flush()
        print("[OK] 8 workflows créés")

        # ── 5. Contacts ──────────────────────────────────────────────
        contacts = [
            EntiteContact(entite_id=e_orange.id, responsable_legal_nom='Koné Alassane',
                          responsable_legal_fonction='Directeur Général',
                          responsable_legal_email='dg@orangeci.com',
                          responsable_legal_telephone='+225 27 20 00 00 01',
                          site_web='https://www.orange.ci'),
            EntiteContact(entite_id=e_mtn.id, responsable_legal_nom='Bamba Moussa',
                          responsable_legal_fonction='CEO',
                          responsable_legal_email='ceo@mtn.ci',
                          responsable_legal_telephone='+225 05 00 00 00 01',
                          site_web='https://www.mtn.ci'),
            EntiteContact(entite_id=e_nsia.id, responsable_legal_nom='Dosso Kadiatou',
                          responsable_legal_fonction='Directrice Générale',
                          responsable_legal_email='dg@nsia.ci',
                          responsable_legal_telephone='+225 27 20 31 55 01'),
            EntiteContact(entite_id=e_sgci.id, responsable_legal_nom='Yapi Claude',
                          responsable_legal_fonction='Directeur Général',
                          responsable_legal_email='dg@sgci.ci'),
            EntiteContact(entite_id=e_clinique.id, responsable_legal_nom='Dr. Konan Eugène',
                          responsable_legal_fonction='Médecin Directeur',
                          responsable_legal_email='direction@clinique-bouake.ci'),
            EntiteContact(entite_id=e_supermarche.id, responsable_legal_nom='Touré Mamadou',
                          responsable_legal_fonction='Gérant',
                          responsable_legal_email='gerant@bonprix-yam.ci'),
            EntiteContact(entite_id=e_transport.id, responsable_legal_nom='Coulibaly Sékou',
                          responsable_legal_fonction='Directeur',
                          responsable_legal_email='direction@transport-sanpedro.ci'),
            EntiteContact(entite_id=e_assurance.id, responsable_legal_nom='Gnéba Patricia',
                          responsable_legal_fonction='PDG',
                          responsable_legal_email='pdg@ava-assurance.ci'),
        ]
        db.session.add_all(contacts)
        db.session.flush()
        print("[OK] 8 contacts créés")

        # ── 6. Conformité ────────────────────────────────────────────
        conformites = [
            EntiteConformite(entite_id=e_orange.id, score_conformite=92,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='1000+', volume_donnees_traitees='10 millions+'),
            EntiteConformite(entite_id=e_mtn.id, score_conformite=68,
                             statut_conformite=StatutConformiteEnum.demarche_en_cours,
                             a_dpo=True, type_dpo=TypeDPOEnum.externe,
                             effectif_entreprise='500-1000', volume_donnees_traitees='5-10 millions'),
            EntiteConformite(entite_id=e_nsia.id, score_conformite=85,
                             statut_conformite=StatutConformiteEnum.conforme,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='200-500', volume_donnees_traitees='1-5 millions'),
            EntiteConformite(entite_id=e_sgci.id, score_conformite=55,
                             statut_conformite=StatutConformiteEnum.demarche_en_cours,
                             a_dpo=False,
                             effectif_entreprise='200-500', volume_donnees_traitees='1-5 millions'),
            EntiteConformite(entite_id=e_clinique.id, score_conformite=78,
                             statut_conformite=StatutConformiteEnum.demarche_achevee,
                             a_dpo=True, type_dpo=TypeDPOEnum.externe,
                             effectif_entreprise='50-200', volume_donnees_traitees='100 000-500 000'),
            EntiteConformite(entite_id=e_supermarche.id, score_conformite=40,
                             statut_conformite=StatutConformiteEnum.demarche_en_cours,
                             a_dpo=False,
                             effectif_entreprise='10-50', volume_donnees_traitees='10 000-100 000'),
            EntiteConformite(entite_id=e_transport.id, score_conformite=30,
                             statut_conformite=StatutConformiteEnum.demarche_en_cours,
                             a_dpo=False,
                             effectif_entreprise='10-50', volume_donnees_traitees='< 10 000'),
            EntiteConformite(entite_id=e_assurance.id, score_conformite=72,
                             statut_conformite=StatutConformiteEnum.demarche_achevee,
                             a_dpo=True, type_dpo=TypeDPOEnum.interne,
                             effectif_entreprise='200-500', volume_donnees_traitees='500 000-1 million'),
        ]
        db.session.add_all(conformites)
        db.session.flush()
        print("[OK] 8 conformités créées")

        # ── 7. Localisations (GPS Côte d'Ivoire) ────────────────────
        localisations = [
            EntiteLocalisation(entite_id=e_orange.id,
                               latitude=5.3220, longitude=-4.0165,
                               adresse_complete='Boulevard Lagunaire, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=e_mtn.id,
                               latitude=5.3498, longitude=-3.9860,
                               adresse_complete='Rue des Jardins, Cocody, Abidjan',
                               precision_gps='15m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=e_nsia.id,
                               latitude=5.3180, longitude=-4.0210,
                               adresse_complete='Avenue Terrasson de Fougères, Plateau, Abidjan',
                               precision_gps='10m', methode_geolocalisation='GPS'),
            EntiteLocalisation(entite_id=e_clinique.id,
                               latitude=7.6936, longitude=-5.0308,
                               adresse_complete='Quartier Commerce, Bouaké',
                               precision_gps='50m', methode_geolocalisation='Adresse'),
            EntiteLocalisation(entite_id=e_supermarche.id,
                               latitude=6.8276, longitude=-5.2893,
                               adresse_complete='Avenue Houphouët-Boigny, Yamoussoukro',
                               precision_gps='30m', methode_geolocalisation='Adresse'),
        ]
        db.session.add_all(localisations)
        db.session.flush()
        print("[OK] 5 localisations GPS créées")

        # ── 8. DPO ───────────────────────────────────────────────────
        dpos = [
            DPO(entite_id=e_orange.id, nom='Yao', prenom='Christelle',
                email='dpo@orangeci.com', telephone='+225 27 20 00 00 10',
                type=TypeDPOEnum.interne, date_designation=date(2023, 1, 15)),
            DPO(entite_id=e_mtn.id, nom='Konaté', prenom='Abdoulaye',
                email='dpo.externe@consulting.ci', telephone='+225 07 12 34 56 78',
                type=TypeDPOEnum.externe, organisme='Data Protection Consulting CI',
                date_designation=date(2023, 6, 20)),
            DPO(entite_id=e_nsia.id, nom='Aké', prenom='Sophie',
                email='dpo@nsia.ci', telephone='+225 27 20 31 55 10',
                type=TypeDPOEnum.interne, date_designation=date(2022, 9, 1)),
            DPO(entite_id=e_clinique.id, nom='Diallo', prenom='Fatoumata',
                email='dpo@cabinet-diallo.ci', telephone='+225 07 99 88 77 66',
                type=TypeDPOEnum.externe, organisme='Cabinet Diallo & Associés',
                date_designation=date(2024, 3, 10)),
        ]
        db.session.add_all(dpos)
        db.session.flush()
        print("[OK] 4 DPO créés")

        # ── 9. Responsables légaux ───────────────────────────────────
        responsables = [
            ResponsableLegal(entite_id=e_orange.id, nom='Koné', prenom='Alassane',
                             fonction='Directeur Général', email='dg@orangeci.com',
                             telephone='+225 27 20 00 00 01'),
            ResponsableLegal(entite_id=e_orange.id, nom='Touré', prenom='Aminata',
                             fonction='Directrice Juridique', email='juridique@orangeci.com'),
            ResponsableLegal(entite_id=e_mtn.id, nom='Bamba', prenom='Moussa',
                             fonction='CEO', email='ceo@mtn.ci'),
            ResponsableLegal(entite_id=e_nsia.id, nom='Dosso', prenom='Kadiatou',
                             fonction='Directrice Générale', email='dg@nsia.ci'),
            ResponsableLegal(entite_id=e_clinique.id, nom='Konan', prenom='Eugène',
                             fonction='Médecin Directeur', email='direction@clinique-bouake.ci'),
            ResponsableLegal(entite_id=e_assurance.id, nom='Gnéba', prenom='Patricia',
                             fonction='PDG', email='pdg@ava-assurance.ci'),
        ]
        db.session.add_all(responsables)
        db.session.flush()
        print("[OK] 6 responsables légaux créés")

        # ── 10. Finalités & bases légales ────────────────────────────
        finalites = [
            FinaliteBaseLegale(entite_id=e_orange.id,
                               finalite='Gestion des clients et facturation',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=40,
                               description="Traitement nécessaire à l'exécution du contrat de service"),
            FinaliteBaseLegale(entite_id=e_orange.id,
                               finalite='Marketing et communication ciblée',
                               base_legale=BaseLegaleEnum.consentement, pourcentage=30,
                               description="Envoi d'offres personnalisées avec consentement"),
            FinaliteBaseLegale(entite_id=e_orange.id,
                               finalite='Obligations réglementaires télécoms',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=30,
                               description="Conservation des données de trafic (loi télécoms)"),
            FinaliteBaseLegale(entite_id=e_mtn.id,
                               finalite='Gestion des abonnés',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=50),
            FinaliteBaseLegale(entite_id=e_mtn.id,
                               finalite='Mobile Money et services financiers',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=50),
            FinaliteBaseLegale(entite_id=e_nsia.id,
                               finalite='Gestion des comptes bancaires',
                               base_legale=BaseLegaleEnum.contrat, pourcentage=60),
            FinaliteBaseLegale(entite_id=e_nsia.id,
                               finalite='Lutte anti-blanchiment (LAB/FT)',
                               base_legale=BaseLegaleEnum.obligation_legale, pourcentage=40),
            FinaliteBaseLegale(entite_id=e_clinique.id,
                               finalite='Gestion des dossiers médicaux',
                               base_legale=BaseLegaleEnum.interet_vital, pourcentage=100,
                               description='Traitement de données de santé pour soins médicaux'),
        ]
        db.session.add_all(finalites)
        db.session.flush()
        print("[OK] 8 finalités créées")

        # ── 11. Sécurité & conformité ────────────────────────────────
        securites = [
            SecuriteConformite(entite_id=e_orange.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=True, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Trimestrielle',
                               dernier_audit=date(2024, 6, 15)),
            SecuriteConformite(entite_id=e_mtn.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=False, notification_violations=True,
                               nombre_violations_12mois=1, formation_personnel=True,
                               frequence_formation='Semestrielle',
                               dernier_audit=date(2024, 3, 20)),
            SecuriteConformite(entite_id=e_nsia.id, politique_securite=True,
                               responsable_securite=True, analyse_risques=True,
                               plan_continuite=True, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Annuelle',
                               dernier_audit=date(2024, 1, 10)),
            SecuriteConformite(entite_id=e_clinique.id, politique_securite=True,
                               responsable_securite=False, analyse_risques=False,
                               plan_continuite=False, notification_violations=True,
                               nombre_violations_12mois=0, formation_personnel=True,
                               frequence_formation='Annuelle'),
        ]
        db.session.add_all(securites)
        db.session.flush()
        print("[OK] 4 sécurité-conformité créées")

        # ── 12. Mesures de sécurité ──────────────────────────────────
        mesures = [
            MesureSecurite(entite_id=e_orange.id, type_mesure=TypeMesureEnum.technique,
                           description='Chiffrement AES-256 des données au repos et en transit',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 1, 1)),
            MesureSecurite(entite_id=e_orange.id, type_mesure=TypeMesureEnum.organisationnelle,
                           description='Politique de gestion des accès (RBAC) et revue trimestrielle',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 3, 15)),
            MesureSecurite(entite_id=e_orange.id, type_mesure=TypeMesureEnum.physique,
                           description='Datacenter Tier III avec contrôle biométrique',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2022, 6, 1)),
            MesureSecurite(entite_id=e_mtn.id, type_mesure=TypeMesureEnum.technique,
                           description='Pare-feu nouvelle génération et SOC 24/7',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 9, 1)),
            MesureSecurite(entite_id=e_nsia.id, type_mesure=TypeMesureEnum.technique,
                           description='Tokenisation des données bancaires (PCI-DSS)',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2022, 12, 1)),
            MesureSecurite(entite_id=e_nsia.id, type_mesure=TypeMesureEnum.organisationnelle,
                           description='Comité de sécurité mensuel et plan de réponse aux incidents',
                           mise_en_oeuvre=True, date_mise_en_oeuvre=date(2023, 2, 1)),
        ]
        db.session.add_all(mesures)
        db.session.flush()
        print("[OK] 6 mesures de sécurité créées")

        # ── 13. Registre de traitements ──────────────────────────────
        registres = [
            RegistreTraitement(entite_id=e_orange.id,
                               nom_traitement='Gestion clientèle mobile',
                               description='Collecte et traitement des données des abonnés mobile',
                               finalite='Fourniture de services télécoms',
                               base_legale='Contrat de service',
                               categories_personnes='Clients, prospects',
                               duree_conservation='5 ans après fin de contrat',
                               destinataires='Service commercial, service technique',
                               transfert_hors_ci=False),
            RegistreTraitement(entite_id=e_orange.id,
                               nom_traitement='Orange Money',
                               description='Service de paiement mobile',
                               finalite='Services financiers mobiles',
                               base_legale='Obligation légale (réglementation BCEAO)',
                               categories_personnes='Utilisateurs Orange Money',
                               duree_conservation='10 ans (obligation comptable)',
                               transfert_hors_ci=True),
            RegistreTraitement(entite_id=e_nsia.id,
                               nom_traitement='Gestion des comptes courants',
                               description='Ouverture et gestion des comptes bancaires',
                               finalite='Services bancaires',
                               base_legale='Contrat + obligation légale',
                               categories_personnes='Clients particuliers et entreprises',
                               duree_conservation='10 ans après clôture',
                               transfert_hors_ci=False),
            RegistreTraitement(entite_id=e_clinique.id,
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
        print("[OK] 4 registres de traitements créés")

        # ── 14. Historique des statuts ────────────────────────────────
        historiques = [
            HistoriqueStatut(entite_id=e_orange.id, ancien_statut='brouillon',
                             nouveau_statut='soumis',
                             modifie_par=None, commentaire='Soumission initiale par l\'entreprise'),
            HistoriqueStatut(entite_id=e_orange.id, ancien_statut='soumis',
                             nouveau_statut='en_verification',
                             modifie_par=admin.id, commentaire='Assigné à un agent pour vérification'),
            HistoriqueStatut(entite_id=e_orange.id, ancien_statut='en_verification',
                             nouveau_statut='valide',
                             modifie_par=admin.id, commentaire='Validation complète du dossier'),
            HistoriqueStatut(entite_id=e_orange.id, ancien_statut='valide',
                             nouveau_statut='publie',
                             modifie_par=super_admin.id, commentaire='Publication sur la carte publique'),
            HistoriqueStatut(entite_id=e_mtn.id, ancien_statut='brouillon',
                             nouveau_statut='soumis',
                             modifie_par=None, commentaire='Soumission initiale'),
            HistoriqueStatut(entite_id=e_mtn.id, ancien_statut='soumis',
                             nouveau_statut='en_verification',
                             modifie_par=admin.id, commentaire='Prise en charge pour vérification'),
            HistoriqueStatut(entite_id=e_nsia.id, ancien_statut='soumis',
                             nouveau_statut='valide',
                             modifie_par=admin.id, commentaire='Validation après vérification complète'),
            HistoriqueStatut(entite_id=e_transport.id, ancien_statut='soumis',
                             nouveau_statut='rejete',
                             modifie_par=admin.id,
                             commentaire='Dossier incomplet : documents manquants'),
            HistoriqueStatut(entite_id=e_supermarche.id, ancien_statut='soumis',
                             nouveau_statut='en_attente_complements',
                             modifie_par=editor.id,
                             commentaire='Informations complémentaires demandées sur le DPO'),
            HistoriqueStatut(entite_id=e_clinique.id, ancien_statut='en_verification',
                             nouveau_statut='conforme',
                             modifie_par=admin.id,
                             commentaire='Dossier conforme, données de santé bien protégées'),
        ]
        db.session.add_all(historiques)
        db.session.flush()
        print("[OK] 10 historiques de statuts créés")

        # ── 15. Assignations ─────────────────────────────────────────
        assignations = [
            AssignationDemande(
                entite_id=e_mtn.id, agent_id=editor.id,
                echeance=(NOW + timedelta(days=7)).date(),
                statut=StatutAssignationEnum.en_cours,
            ),
            AssignationDemande(
                entite_id=e_supermarche.id, agent_id=editor.id,
                echeance=(NOW + timedelta(days=14)).date(),
                statut=StatutAssignationEnum.en_cours,
            ),
            AssignationDemande(
                entite_id=e_orange.id, agent_id=editor.id,
                echeance=(NOW - timedelta(days=5)).date(),
                statut=StatutAssignationEnum.valide,
                traite_le=NOW - timedelta(days=15),
                valide_par=admin.id,
                valide_le=NOW - timedelta(days=10),
            ),
        ]
        db.session.add_all(assignations)
        db.session.flush()
        print("[OK] 3 assignations créées")

        # ── 16. Feedbacks ────────────────────────────────────────────
        feedbacks = [
            FeedbackVerification(
                entite_id=e_supermarche.id, agent_id=editor.id,
                commentaires='Le dossier nécessite des compléments sur la désignation du DPO et les mesures de sécurité.',
                elements_manquants=['Désignation DPO', 'Politique de sécurité', 'Registre des traitements'],
                delai_fourniture=date.today() + timedelta(days=15),
            ),
            FeedbackVerification(
                entite_id=e_mtn.id, agent_id=editor.id,
                commentaires='Bon dossier global, quelques précisions à apporter sur les transferts internationaux.',
                elements_manquants=['Détail des transferts hors CI'],
            ),
        ]
        db.session.add_all(feedbacks)
        db.session.flush()
        print("[OK] 2 feedbacks créés")

        # ── 17. Demandes de rapprochement ──────────────────────────
        rapprochements = [
            DemandeRapprochement(
                entite_id=e_transport.id,
                compte_entreprise_id=orange.id,
                email_demandeur=orange.email,
                numero_cc=e_transport.numero_cc,
                raison_demande='Cette entité correspond à notre filiale Transport Express. Nous souhaitons rapprocher ce dossier à notre compte.',
                statut=StatutRapprochementEnum.en_attente,
            ),
            DemandeRapprochement(
                entite_id=e_clinique.id,
                compte_entreprise_id=nsia.id,
                email_demandeur=nsia.email,
                numero_cc=e_clinique.numero_cc,
                raison_demande='Erreur lors de la saisie initiale — cette clinique est un établissement partenaire NSIA.',
                statut=StatutRapprochementEnum.rejete,
                traite_par=admin.id,
                date_traitement=NOW - timedelta(days=3),
                commentaire_artci='Demande rejetée : aucun lien juridique établi entre NSIA et la clinique.',
            ),
        ]
        db.session.add_all(rapprochements)
        db.session.flush()
        print("[OK] 2 demandes de rapprochement créées")

        # ── 18. Renouvellements ────────────────────────────────────
        renouvellements = [
            Renouvellement(
                entite_id=e_orange.id,
                date_expiration_agrement=date.today() + timedelta(days=120),
                motif='Renouvellement annuel de l\'agrément protection des données.',
                statut=StatutRenouvellementEnum.en_attente,
            ),
            Renouvellement(
                entite_id=e_nsia.id,
                date_expiration_agrement=date.today() + timedelta(days=25),
                motif='Expiration proche, demande de renouvellement anticipé.',
                statut=StatutRenouvellementEnum.approuve,
                traite_par=admin.id,
                date_traitement=NOW - timedelta(days=5),
                commentaire='Renouvellement approuvé pour 1 an.',
            ),
        ]
        db.session.add_all(renouvellements)
        db.session.flush()
        print("[OK] 2 renouvellements créés")

        # ── 19. Notifications ──────────────────────────────────────
        notifications = [
            Notification(
                destinataire_type='artci', destinataire_id=admin.id,
                type='nouvelle_demande',
                titre='Nouvelle demande soumise',
                message=f'L\'entreprise {sgci.denomination} a soumis une demande de déclaration.',
                lue=False, entite_id=e_sgci.id,
            ),
            Notification(
                destinataire_type='artci', destinataire_id=editor.id,
                type='echeance',
                titre='Échéance de traitement proche',
                message=f'L\'assignation pour {mtn.denomination} arrive à échéance dans 3 jours.',
                lue=False, entite_id=e_mtn.id,
            ),
            Notification(
                destinataire_type='entreprise', destinataire_id=orange.id,
                type='validation',
                titre='Dossier publié',
                message='Votre dossier a été validé et publié sur la carte des responsables de traitement.',
                lue=True, entite_id=e_orange.id,
            ),
            Notification(
                destinataire_type='artci', destinataire_id=admin.id,
                type='rapprochement',
                titre='Demande de rapprochement',
                message=f'{orange.denomination} a soumis une demande de rapprochement pour l\'entité Transport Express San-Pédro.',
                lue=False, entite_id=e_transport.id,
            ),
            Notification(
                destinataire_type='entreprise', destinataire_id=mtn.id,
                type='renouvellement',
                titre='Renouvellement à prévoir',
                message='Votre agrément expire dans 90 jours. Pensez à soumettre une demande de renouvellement.',
                lue=False, entite_id=e_mtn.id,
            ),
        ]
        db.session.add_all(notifications)
        db.session.flush()
        print("[OK] 5 notifications créées")

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
        print()
        print("  ARTCI Staff :")
        print("  +--------------------------+-------------+------------------+")
        print("  | Email                    | Rôle        | Mot de passe     |")
        print("  +--------------------------+-------------+------------------+")
        print("  | superadmin@artci.ci      | super_admin | SuperAdmin123!   |")
        print("  | admin@artci.ci           | admin       | Admin123!        |")
        print("  | editor@artci.ci          | editor      | Editor123!       |")
        print("  | reader@artci.ci          | reader      | Reader123!       |")
        print("  +--------------------------+-------------+------------------+")
        print()
        print("  Entreprises :")
        print("  +--------------------------+---------------------------+-------------+")
        print("  | Email                    | Dénomination              | Mot de passe|")
        print("  +--------------------------+---------------------------+-------------+")
        print("  | contact@orangeci.com     | Orange Côte d'Ivoire      | Orange123!  |")
        print("  | info@mtn.ci              | MTN Côte d'Ivoire         | Mtn123!     |")
        print("  | contact@nsia.ci          | NSIA Banque CI            | Nsia123!    |")
        print("  | contact@sgci.ci          | Société Générale CI       | Sgci123!    |")
        print("  +--------------------------+---------------------------+-------------+")
        print()


if __name__ == '__main__':
    seed()
