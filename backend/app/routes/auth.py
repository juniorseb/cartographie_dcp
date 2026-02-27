"""
Routes d'authentification pour ARTCI DCP Platform.
Inscription, connexion, OTP, gestion mots de passe.
8 endpoints, pas d'auth requise (sauf change-password).
"""
from flask import Blueprint, request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from marshmallow import ValidationError
from app.schemas.auth import (
    RegisterInputSchema, VerifyOTPInputSchema, LoginInputSchema,
    ForgotPasswordInputSchema, ResetPasswordInputSchema,
    ChangePasswordInputSchema, CompteEntrepriseOutputSchema,
    LoginResponseSchema
)
from app.schemas.user import UserOutputSchema
from app.services.auth_service import AuthService
from app.utils.responses import (
    success_response, created_response, error_response,
    validation_error_response
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Inscription entreprise + envoi OTP."""
    schema = RegisterInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        compte, _ = AuthService.register_entreprise(data)
        return created_response(
            CompteEntrepriseOutputSchema().dump(compte),
            'Inscription réussie. Vérifiez votre email pour le code OTP.'
        )
    except ValueError as e:
        return error_response(str(e), 409)


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Vérifier un code OTP à 6 chiffres."""
    schema = VerifyOTPInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    is_valid, error = AuthService.verify_otp_code(
        data['email'], data['code'], data['type']
    )

    if not is_valid:
        return error_response(error, 400)

    return success_response(message='Code OTP vérifié avec succès.')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Connexion entreprise OU ARTCI staff (via login_type)."""
    schema = LoginInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    login_type = data.get('login_type', 'entreprise')

    try:
        if login_type == 'artci':
            result = AuthService.login_artci(data['email'], data['password'])
            user_data = UserOutputSchema().dump(result.pop('user'))
            result['user'] = user_data
        else:
            result = AuthService.login_entreprise(data['email'], data['password'])
            compte_data = CompteEntrepriseOutputSchema().dump(result.pop('compte'))
            result['compte'] = compte_data

        return success_response(result, 'Connexion réussie.')
    except ValueError as e:
        return error_response(str(e), 401)


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Rafraîchir l'access token avec le refresh token."""
    verify_jwt_in_request(refresh=True)
    identity = get_jwt_identity()
    claims = get_jwt()

    result = AuthService.refresh_tokens(identity, claims)
    return success_response(result, 'Token rafraîchi.')


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Blacklister le token courant."""
    verify_jwt_in_request()
    jti = get_jwt()['jti']
    AuthService.logout(jti)
    return success_response(message='Déconnexion réussie.')


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Envoyer un OTP de réinitialisation du mot de passe."""
    schema = ForgotPasswordInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    AuthService.forgot_password(data['email'])
    # Toujours répondre 200 (anti-énumération)
    return success_response(
        message='Si un compte existe avec cet email, un code OTP a été envoyé.'
    )


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Réinitialiser le mot de passe avec un code OTP."""
    schema = ResetPasswordInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        AuthService.reset_password(
            data['email'], data['code'], data['new_password']
        )
        return success_response(message='Mot de passe réinitialisé avec succès.')
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route('/change-password', methods=['PUT'])
def change_password():
    """Changer le mot de passe (utilisateur connecté)."""
    verify_jwt_in_request()
    claims = get_jwt()

    # Seules les entreprises changent leur mot de passe ici
    if claims.get('user_type') != 'entreprise':
        return error_response('Route réservée aux comptes entreprise.', 403)

    schema = ChangePasswordInputSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        AuthService.change_password(
            get_jwt_identity(),
            data['current_password'],
            data['new_password']
        )
        return success_response(message='Mot de passe changé avec succès.')
    except ValueError as e:
        return error_response(str(e), 400)
