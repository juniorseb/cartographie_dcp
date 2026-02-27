"""
Utilitaires OTP pour ARTCI DCP Platform.
Génération, envoi email, vérification des codes à 6 chiffres.
"""
import secrets
from datetime import datetime, timezone, timedelta
from flask import current_app
from flask_mail import Message
from app.extensions import db, mail


def generate_otp_code(length=6):
    """Générer un code OTP numérique cryptographiquement sécurisé."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def create_otp(compte_entreprise_id, otp_type):
    """
    Créer un enregistrement OTP en base.
    1. Invalide les OTP précédents non utilisés du même type
    2. Génère un nouveau code
    3. Définit expires_at
    """
    from app.models.otp_codes import OTPCode
    from app.models.enums import TypeOTPEnum

    # Invalider les anciens OTP non utilisés
    OTPCode.query.filter_by(
        compte_entreprise_id=compte_entreprise_id,
        type=TypeOTPEnum(otp_type),
        used=False
    ).update({'used': True})

    # Créer le nouveau
    expiration_minutes = current_app.config.get('OTP_EXPIRATION_MINUTES', 10)
    code_length = current_app.config.get('OTP_LENGTH', 6)

    otp = OTPCode(
        compte_entreprise_id=compte_entreprise_id,
        code=generate_otp_code(code_length),
        type=TypeOTPEnum(otp_type),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes),
        used=False
    )
    db.session.add(otp)
    db.session.commit()
    return otp


def send_otp_email(email, code, otp_type):
    """
    Envoyer le code OTP par email via Flask-Mail.
    Retourne True si envoyé avec succès.
    """
    subjects = {
        'inscription': 'ARTCI DCP - Code de vérification de votre compte',
        'connexion': 'ARTCI DCP - Code de connexion sécurisée',
        'reset_password': 'ARTCI DCP - Code de réinitialisation du mot de passe',
    }
    subject = subjects.get(otp_type, 'ARTCI DCP - Code de vérification')

    body = f"""Bonjour,

Votre code de vérification ARTCI DCP est :

    {code}

Ce code expire dans {current_app.config.get('OTP_EXPIRATION_MINUTES', 10)} minutes.

Si vous n'avez pas demandé ce code, veuillez ignorer cet email.

Cordialement,
L'équipe ARTCI - Protection des Données Personnelles
"""
    try:
        msg = Message(
            subject=subject,
            recipients=[email],
            body=body
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f'Erreur envoi OTP email: {e}')
        return False


def verify_otp(email, code, otp_type):
    """
    Vérifier un code OTP.
    1. Trouver le CompteEntreprise par email
    2. Chercher un OTPCode valide (code, type, non utilisé, non expiré)
    3. Marquer comme utilisé
    4. Si inscription : marquer email_verified = True
    Returns (is_valid, error_message).
    """
    from app.models.comptes_entreprises import CompteEntreprise
    from app.models.otp_codes import OTPCode
    from app.models.enums import TypeOTPEnum

    compte = CompteEntreprise.query.filter_by(email=email).first()
    if not compte:
        return False, 'Aucun compte trouvé avec cet email.'

    otp = OTPCode.query.filter_by(
        compte_entreprise_id=compte.id,
        code=code,
        type=TypeOTPEnum(otp_type),
        used=False
    ).first()

    if not otp:
        return False, 'Code OTP invalide.'

    if datetime.now(timezone.utc) > otp.expires_at.replace(tzinfo=timezone.utc) \
            if otp.expires_at.tzinfo is None else otp.expires_at:
        otp.used = True
        db.session.commit()
        return False, 'Code OTP expiré.'

    # Marquer comme utilisé
    otp.used = True

    # Si inscription, activer le compte
    if otp_type == 'inscription':
        compte.email_verified = True

    db.session.commit()
    return True, ''
