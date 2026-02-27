"""
Décorateurs d'authentification et RBAC pour ARTCI DCP Platform.
"""
from functools import wraps
from flask import g, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.utils.password import is_password_expired


def role_required(*allowed_roles):
    """
    Décorateur pour les routes ARTCI staff.
    Vérifie que le JWT contient user_type='artci' et un rôle autorisé.
    Usage : @role_required('super_admin', 'admin', 'editor')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()

            if claims.get('user_type') != 'artci':
                return jsonify({'error': 'Accès réservé au personnel ARTCI.'}), 403

            user_role = claims.get('role')
            if user_role not in allowed_roles:
                return jsonify({'error': 'Permissions insuffisantes.'}), 403

            g.current_user_id = get_jwt_identity()
            g.current_user_type = 'artci'
            g.current_user_role = user_role
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def entreprise_auth_required(fn):
    """
    Décorateur pour les routes entreprise.
    Vérifie JWT user_type='entreprise', email vérifié, et password non expiré.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()

        if claims.get('user_type') != 'entreprise':
            return jsonify({'error': 'Accès réservé aux entreprises.'}), 403

        if not claims.get('email_verified'):
            return jsonify({'error': 'Email non vérifié. Vérifiez votre code OTP.'}), 403

        # Vérifier expiration mot de passe
        from app.models.comptes_entreprises import CompteEntreprise
        compte = CompteEntreprise.query.get(get_jwt_identity())
        if compte and is_password_expired(compte.password_expires_at):
            return jsonify({
                'error': 'password_expired',
                'message': 'Votre mot de passe a expiré. Veuillez le changer.'
            }), 403

        g.current_user_id = get_jwt_identity()
        g.current_user_type = 'entreprise'
        return fn(*args, **kwargs)
    return wrapper


def admin_or_above(fn):
    """Raccourci : @role_required('super_admin', 'admin')"""
    return role_required('super_admin', 'admin')(fn)


def editor_or_above(fn):
    """Raccourci : @role_required('super_admin', 'admin', 'editor')"""
    return role_required('super_admin', 'admin', 'editor')(fn)
