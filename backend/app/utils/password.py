"""
Utilitaires de gestion des mots de passe pour ARTCI DCP Platform.
Hashing bcrypt, validation de force, vérification d'expiration.
"""
import re
from datetime import datetime, timezone, timedelta
import bcrypt
from flask import current_app


def hash_password(plain_password: str) -> str:
    """Hasher un mot de passe avec bcrypt."""
    return bcrypt.hashpw(
        plain_password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')


def verify_password(plain_password: str, hashed: str) -> bool:
    """Vérifier un mot de passe contre un hash bcrypt."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed.encode('utf-8')
    )


def validate_password_strength(password: str) -> tuple:
    """
    Valider la force d'un mot de passe.
    Règles : min 8 chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    min_length = current_app.config.get('PASSWORD_MIN_LENGTH', 8)

    if len(password) < min_length:
        errors.append(f'Le mot de passe doit contenir au moins {min_length} caractères.')
    if not re.search(r'[A-Z]', password):
        errors.append('Le mot de passe doit contenir au moins une lettre majuscule.')
    if not re.search(r'[a-z]', password):
        errors.append('Le mot de passe doit contenir au moins une lettre minuscule.')
    if not re.search(r'\d', password):
        errors.append('Le mot de passe doit contenir au moins un chiffre.')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]', password):
        errors.append('Le mot de passe doit contenir au moins un caractère spécial.')

    return (len(errors) == 0, errors)


def is_password_expired(password_expires_at) -> bool:
    """Vérifier si le mot de passe a expiré."""
    if password_expires_at is None:
        return False
    now = datetime.now(timezone.utc)
    if password_expires_at.tzinfo is None:
        from datetime import timezone as tz
        password_expires_at = password_expires_at.replace(tzinfo=tz.utc)
    return now >= password_expires_at


def calculate_password_expiry() -> datetime:
    """Calculer la date d'expiration du mot de passe (maintenant + 6 mois)."""
    days = current_app.config.get('PASSWORD_EXPIRY_DAYS', 180)
    return datetime.now(timezone.utc) + timedelta(days=days)
