"""
Seed minimal : uniquement les comptes utilisateurs (ARTCI staff + Entreprises test).
Aucune entite, aucun dossier, aucune donnee de cartographie.

Lance via : python seed_users_only.py
"""
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import User, CompteEntreprise
from app.models.enums import RoleEnum
from app.utils.password import hash_password, calculate_password_expiry


PWD = 'Test@1234'
NOW = datetime.now(timezone.utc)


def main():
    app = create_app()
    with app.app_context():
        # Garde-fou : pas de seed si users deja presents
        if User.query.first() or CompteEntreprise.query.first():
            print("ATTENTION : des utilisateurs existent deja en BDD.")
            print("Lancez ce seed uniquement sur une base vide.")
            print("Pour wiper : DROP SCHEMA public CASCADE; CREATE SCHEMA public; puis flask db upgrade head")
            sys.exit(1)

        print("=== Seed minimal : users uniquement ===\n")

        # ----- 1. Users ARTCI -----
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
                telephone='+225 05 06 07 08 09',
                is_active=True,
            ),
            User(
                nom='Bamba', prenom='Sekou',
                email='reader@artci.ci',
                password_hash=hash_password(PWD),
                role=RoleEnum.reader,
                telephone='+225 02 03 04 05 06',
                is_active=True,
            ),
        ]
        db.session.add_all(users)
        print(f"  {len(users)} utilisateurs ARTCI crees :")
        for u in users:
            print(f"   - {u.email}  ({u.role.value})")

        # ----- 2. Comptes Entreprise test -----
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
                inscription_statut='approved',
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
                dg_email='entrepriseA@test.ci',
                dg_nom='Test', dg_prenom='A',
                dpo_email='dpoA@test.ci',
                dpo_nom='DPO', dpo_prenom='A',
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
                inscription_statut='approved',
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
                dg_email='entrepriseB@test.ci',
                dg_nom='Test', dg_prenom='B',
                dpo_email='dpoB@test.ci',
                dpo_nom='DPO', dpo_prenom='B',
            ),
            CompteEntreprise(
                email='entrepriseC@test.ci',
                password_hash=hash_password(PWD),
                denomination='Entreprise C',
                numero_cc='CI-ABJ-2018-B-11111',
                telephone='+225 27 20 31 55 00',
                adresse='Avenue Terrasson de Fougeres, Plateau',
                ville='Abidjan', region='Abidjan',
                email_verified=True, is_active=True,
                inscription_statut='approved',
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
                dg_email='entrepriseC@test.ci',
                dg_nom='Test', dg_prenom='C',
                dpo_email='dpoC@test.ci',
                dpo_nom='DPO', dpo_prenom='C',
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
                inscription_statut='approved',
                password_last_changed=NOW,
                password_expires_at=pwd_expiry,
                dg_email='entrepriseD@test.ci',
                dg_nom='Test', dg_prenom='D',
                dpo_email='dpoD@test.ci',
                dpo_nom='DPO', dpo_prenom='D',
            ),
        ]
        db.session.add_all(comptes)
        print(f"\n  {len(comptes)} comptes Entreprise test crees :")
        for c in comptes:
            print(f"   - {c.email}  ({c.denomination})")

        db.session.commit()

        print(f"\n=== Termine ===")
        print(f"Tous les comptes : mot de passe = '{PWD}'")
        print()


if __name__ == '__main__':
    main()
