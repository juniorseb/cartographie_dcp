"""
Schemas Marshmallow pour les utilisateurs ARTCI (personnel).
"""
from marshmallow import Schema, fields, validate
from app.schemas.common import EnumField


# --- INPUT ---

class UserCreateInputSchema(Schema):
    """POST /api/admin/users"""
    nom = fields.String(required=True, validate=validate.Length(min=1, max=100))
    prenom = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    role = fields.String(required=True, validate=validate.OneOf([
        'super_admin', 'admin', 'editor', 'reader'
    ]))
    telephone = fields.String(validate=validate.Length(max=20))


class UserUpdateInputSchema(Schema):
    """PUT /api/admin/users/:id"""
    nom = fields.String(validate=validate.Length(min=1, max=100))
    prenom = fields.String(validate=validate.Length(min=1, max=100))
    email = fields.Email()
    role = fields.String(validate=validate.OneOf([
        'super_admin', 'admin', 'editor', 'reader'
    ]))
    telephone = fields.String(validate=validate.Length(max=20))
    is_active = fields.Boolean()


# --- OUTPUT ---

class UserOutputSchema(Schema):
    """Utilisateur ARTCI sérialisé (sans password_hash)."""
    id = fields.String()
    nom = fields.String()
    prenom = fields.String()
    email = fields.String()
    role = EnumField()
    telephone = fields.String()
    is_active = fields.Boolean()
    last_login = fields.DateTime()
    createdAt = fields.DateTime()


class UserSummarySchema(Schema):
    """Référence compacte utilisateur (pour imbrication)."""
    id = fields.String()
    nom = fields.String()
    prenom = fields.String()
    role = EnumField()
