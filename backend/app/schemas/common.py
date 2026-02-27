"""
Schemas Marshmallow communs pour ARTCI DCP Platform.
EnumField, pagination, réponses standard.
"""
from marshmallow import Schema, fields, validate


class EnumField(fields.String):
    """Champ personnalisé qui sérialise les Enum Python vers leur .value."""

    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        return value.value if hasattr(value, 'value') else value


class PaginationSchema(Schema):
    """Paramètres de requête pour les endpoints paginés."""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=50, validate=validate.Range(min=1, max=200))
    sort_by = fields.String(load_default='createdAt')
    sort_order = fields.String(load_default='desc', validate=validate.OneOf(['asc', 'desc']))


class PaginatedResponseSchema(Schema):
    """Enveloppe de réponse paginée standard."""
    items = fields.List(fields.Dict())
    total = fields.Integer()
    page = fields.Integer()
    per_page = fields.Integer()
    pages = fields.Integer()
    has_next = fields.Boolean()
    has_prev = fields.Boolean()
