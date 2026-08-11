"""
Schemas Marshmallow pour l'authentification ARTCI DCP Platform.
Inscription, connexion, OTP, gestion mots de passe.
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError


# --- INPUT ---

class RegisterInputSchema(Schema):
    """POST /api/auth/register - inscription.

    3 profils (statut_juridique) :
    - personne_physique : seuls dg_nom/dg_prenom/dg_email sont requis (la
      personne EST le declarant, pas de RL/Demandeur distincts, pas
      d'entreprise). denomination/numero_cc sont synthetises en backend.
    - pm_droit_prive / pm_droit_public : comportement historique inchange,
      3 sections (Entreprise / Representant legal / Demandeur) requises.

    Pas de mot de passe a l'inscription : il est genere et envoye par email
    a la validation par l'ARTCI."""
    statut_juridique = fields.String(
        required=True,
        validate=validate.OneOf(['personne_physique', 'pm_droit_prive', 'pm_droit_public'])
    )
    # Section 1 - Entreprise (requis seulement pour pm_droit_prive/pm_droit_public)
    denomination = fields.String(validate=validate.Length(min=2, max=255))
    numero_cc = fields.String(validate=validate.Length(min=2, max=50))
    telephone = fields.String(validate=validate.Length(max=20))
    adresse = fields.String(validate=validate.Length(max=500))
    ville = fields.String(validate=validate.Length(max=100))
    region = fields.String(validate=validate.Length(max=100))
    # Section 2 - Representant legal / Referant (DG) - email = acces login
    # Pour personne_physique : ce sont les infos de la personne elle-meme.
    dg_nom = fields.String(required=True, validate=validate.Length(min=2, max=200))
    dg_prenom = fields.String(required=True, validate=validate.Length(min=2, max=200))
    dg_fonction = fields.String(validate=validate.Length(max=200))
    dg_telephone = fields.String(validate=validate.Length(max=30))
    dg_email = fields.Email(required=True)
    # Section 3 - DPO (requis seulement pour pm_droit_prive/pm_droit_public)
    dpo_nom = fields.String(validate=validate.Length(min=2, max=200))
    dpo_prenom = fields.String(validate=validate.Length(min=2, max=200))
    dpo_telephone = fields.String(validate=validate.Length(max=30))
    dpo_email = fields.Email()
    dpo_type = fields.String(validate=validate.OneOf(['interne', 'externe']))
    dpo_organisme = fields.String(validate=validate.Length(max=255))

    @validates_schema
    def validate_par_statut_juridique(self, data, **kwargs):
        if data.get('statut_juridique') == 'personne_physique':
            return  # pas d'entreprise ni de DPO/Demandeur distinct a valider
        errors = {}
        for field_name in ('denomination', 'numero_cc', 'dpo_nom', 'dpo_prenom', 'dpo_email'):
            if not data.get(field_name):
                errors[field_name] = ['Ce champ est obligatoire pour une personne morale.']
        if errors:
            raise ValidationError(errors)


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
    statut_juridique = fields.String()
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
    password_must_change = fields.Boolean()
