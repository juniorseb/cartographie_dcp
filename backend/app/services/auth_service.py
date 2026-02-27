"""
Service d'authentification pour ARTCI DCP Platform.
Inscription, connexion, OTP, gestion mots de passe.
"""
from datetime import datetime, timezone
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token
from app.extensions import db
from app.models.comptes_entreprises import CompteEntreprise
from app.models.users import User
from app.models.enums import RoleEnum
from app.utils.password import (
    hash_password, verify_password, validate_password_strength,
    calculate_password_expiry
)
from app.utils.otp import create_otp, send_otp_email, verify_otp


class AuthService:

    @staticmethod
    def register_entreprise(data):
        """
        Inscrire une nouvelle entreprise.
        1. Vérifier unicité email et numero_cc
        2. Valider force du mot de passe
        3. Créer le compte
        4. Générer et envoyer OTP
        """
        if CompteEntreprise.query.filter_by(email=data['email']).first():
            raise ValueError('Un compte existe déjà avec cet email.')

        if CompteEntreprise.query.filter_by(numero_cc=data['numero_cc']).first():
            raise ValueError('Un compte existe déjà avec ce numéro CC.')

        is_valid, errors = validate_password_strength(data['password'])
        if not is_valid:
            raise ValueError(' '.join(errors))

        compte = CompteEntreprise(
            email=data['email'],
            password_hash=hash_password(data['password']),
            denomination=data['denomination'],
            numero_cc=data['numero_cc'],
            telephone=data.get('telephone'),
            adresse=data.get('adresse'),
            ville=data.get('ville'),
            region=data.get('region'),
            email_verified=False,
            is_active=True,
            password_last_changed=datetime.now(timezone.utc),
            password_expires_at=calculate_password_expiry()
        )
        db.session.add(compte)
        db.session.commit()

        # Générer et envoyer OTP
        otp = create_otp(compte.id, 'inscription')
        send_otp_email(compte.email, otp.code, 'inscription')

        return compte, otp.code

    @staticmethod
    def verify_otp_code(email, code, otp_type):
        """Vérifier un code OTP."""
        return verify_otp(email, code, otp_type)

    @staticmethod
    def login_entreprise(email, password):
        """
        Connexion entreprise.
        Retourne dict avec tokens JWT et info password_expired.
        """
        compte = CompteEntreprise.query.filter_by(email=email).first()
        if not compte:
            raise ValueError('Email ou mot de passe incorrect.')

        if not compte.is_active:
            raise ValueError('Ce compte a été désactivé.')

        if not compte.email_verified:
            raise ValueError('Email non vérifié. Vérifiez votre code OTP.')

        if not verify_password(password, compte.password_hash):
            raise ValueError('Email ou mot de passe incorrect.')

        # Vérifier expiration mot de passe
        from app.utils.password import is_password_expired
        password_expired = is_password_expired(compte.password_expires_at)

        additional_claims = {
            'user_type': 'entreprise',
            'email_verified': compte.email_verified
        }

        access_token = create_access_token(
            identity=compte.id,
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=compte.id,
            additional_claims=additional_claims
        )

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()),
            'password_expired': password_expired,
            'compte': compte
        }

    @staticmethod
    def login_artci(email, password):
        """
        Connexion personnel ARTCI.
        Retourne dict avec tokens JWT incluant le rôle.
        """
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError('Email ou mot de passe incorrect.')

        if not user.is_active:
            raise ValueError('Ce compte a été désactivé.')

        if not verify_password(password, user.password_hash):
            raise ValueError('Email ou mot de passe incorrect.')

        # Mettre à jour last_login
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        additional_claims = {
            'user_type': 'artci',
            'role': user.role.value
        }

        access_token = create_access_token(
            identity=user.id,
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims=additional_claims
        )

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()),
            'user': user
        }

    @staticmethod
    def refresh_tokens(identity, claims):
        """Générer un nouveau access token à partir du refresh token."""
        additional_claims = {
            'user_type': claims.get('user_type'),
        }
        if claims.get('user_type') == 'artci':
            additional_claims['role'] = claims.get('role')
        else:
            additional_claims['email_verified'] = claims.get('email_verified')

        access_token = create_access_token(
            identity=identity,
            additional_claims=additional_claims
        )
        return {
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()),
        }

    @staticmethod
    def logout(jti):
        """Ajouter le JTI du token à la blacklist."""
        from app.extensions import token_blacklist
        token_blacklist.add(jti)

    @staticmethod
    def forgot_password(email):
        """Envoyer un OTP de réinitialisation (silencieux si compte inexistant)."""
        compte = CompteEntreprise.query.filter_by(email=email).first()
        if not compte:
            return  # Silencieux pour éviter l'énumération de comptes

        otp = create_otp(compte.id, 'reset_password')
        send_otp_email(email, otp.code, 'reset_password')

    @staticmethod
    def reset_password(email, code, new_password):
        """Réinitialiser le mot de passe avec un code OTP."""
        is_valid, error = verify_otp(email, code, 'reset_password')
        if not is_valid:
            raise ValueError(error)

        is_strong, errors = validate_password_strength(new_password)
        if not is_strong:
            raise ValueError(' '.join(errors))

        compte = CompteEntreprise.query.filter_by(email=email).first()
        compte.password_hash = hash_password(new_password)
        compte.password_last_changed = datetime.now(timezone.utc)
        compte.password_expires_at = calculate_password_expiry()
        db.session.commit()

    @staticmethod
    def change_password(compte_id, current_password, new_password):
        """Changer le mot de passe (utilisateur connecté)."""
        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte non trouvé.')

        if not verify_password(current_password, compte.password_hash):
            raise ValueError('Mot de passe actuel incorrect.')

        if current_password == new_password:
            raise ValueError('Le nouveau mot de passe doit être différent de l\'actuel.')

        is_strong, errors = validate_password_strength(new_password)
        if not is_strong:
            raise ValueError(' '.join(errors))

        compte.password_hash = hash_password(new_password)
        compte.password_last_changed = datetime.now(timezone.utc)
        compte.password_expires_at = calculate_password_expiry()
        db.session.commit()
