"""
Helper de pagination générique pour ARTCI DCP Platform.
Encapsule SQLAlchemy .paginate() avec sérialisation Marshmallow.
"""
from flask import request, current_app


def paginate(query, schema, page=None, per_page=None):
    """
    Paginer une requête SQLAlchemy et sérialiser les résultats.

    Args:
        query: SQLAlchemy query object
        schema: Instance de Marshmallow schema pour la sérialisation
        page: Numéro de page (par défaut depuis request.args)
        per_page: Éléments par page (par défaut depuis config)

    Returns:
        dict avec items, total, page, per_page, pages, has_next, has_prev
    """
    if page is None:
        page = request.args.get('page', 1, type=int)
    if per_page is None:
        per_page = request.args.get(
            'per_page',
            current_app.config.get('ITEMS_PER_PAGE', 50),
            type=int
        )

    # Limiter per_page pour éviter les abus
    per_page = min(per_page, 200)
    page = max(page, 1)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        'items': schema.dump(pagination.items, many=True),
        'total': pagination.total,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }
