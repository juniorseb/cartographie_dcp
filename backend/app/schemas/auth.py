"""
Schemas Marshmallow pour l'authentification ARTCI DCP Platform.
Inscription, connexion, OTP, gestion mots de passe.
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError


# --- INPUT ---

class RegisterInputSchema(Schema):
    """POST /api/auth/register"""
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    password_confirm = fields.String(required=True)
    denomination = fields.String(required=True, validate=validate.Length(min=2, max=255))
    numero_cc = fields.String(required=True, validate=validate.Length(min=2, max=50))
    telephone = fields.String(validate=validate.Length(max=20))
    adresse = fields.String(validate=validate.Length(max=500))
    ville = fields.String(validate=validate.Length(max=100))
    region = fields.String(validate=validate.Length(max=100))

    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        if data.get('password') != data.get('password_confirm'):
            raise ValidationError(
                'Les mots de passe ne correspondent pas.',
                field_name='password_confirm'
            )


class VerifyOTPInputSchema(Schema):
    """POST /api/auth/verify-otp"""
    email = fields.Email(required=True)
    code = fields.String(required=True, validate=validate.Length(equal=6))
    type = fields.String(
        required=True,
        validate=validate.OneOf(['inscription', 'connexion', 'reset_password'])
    )


class LoginInputSchema(Schema):
    """POST /api/auth/login"""
    email = fields.Email(required=True)
    password = fields.String(required=True)
    login_type = fields.String(
        load_default='entreprise',
        validate=validate.OneOf(['entreprise', 'artci'])
    )


class ForgotPasswordInputSchema(Schema):
    """POST /api/auth/forgot-password"""
    email = fields.Email(required=True)


class ResetPasswordInputSchema(Schema):
    """POST /api/auth/reset-password"""
    email = fields.Email(required=True)
    code = fields.String(required=True, validate=validate.Length(equal=6))
    new_password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    new_password_confirm = fields.String(required=True)

    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        if data.get('new_password') != data.get('new_password_confirm'):
            raise ValidationError(
                'Les mots de passe ne correspondent pas.',
                field_name='new_password_confirm'
            )


class ChangePasswordInputSchema(Schema):
    """PUT /api/auth/change-password"""
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    new_password_confirm = fields.String(required=True)

    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        if data.get('new_password') != data.get('new_password_confirm'):
            raise ValidationError(
                'Les mots de passe ne correspondent pas.',
                field_name='new_password_confirm'
            )


# --- OUTPUT ---

class CompteEntrepriseOutputSchema(Schema):
    """Compte entreprise sérialisé (sans password_hash)."""
    id = fields.String()
    email = fields.String()
    denomination = fields.String()
    numero_cc = fields.String()
    telephone = fields.String()
    adresse = fields.String()
    ville = fields.String()
    region = fields.String()
    email_verified = fields.Boolean()
    is_active = fields.Boolean()
    password_expires_at = fields.DateTime()
    createdAt = fields.DateTime()


class LoginResponseSchema(Schema):
    """Réponse de connexion avec tokens JWT."""
    access_token = fields.String()
    refresh_token = fields.String()
    token_type = fields.String(dump_default='Bearer')
    expires_in = fields.Integer()
    password_expired = fields.Boolean()
