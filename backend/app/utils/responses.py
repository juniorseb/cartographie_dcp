"""
Helpers de réponses JSON standardisées pour ARTCI DCP Platform.
"""
from flask import jsonify


def success_response(data=None, message='Succès', status_code=200):
    """Réponse JSON de succès standardisée."""
    body = {'message': message}
    if data is not None:
        body['data'] = data
    return jsonify(body), status_code


def created_response(data, message='Créé avec succès'):
    """Réponse 201 Created."""
    return success_response(data=data, message=message, status_code=201)


def no_content_response():
    """Réponse 204 No Content."""
    return '', 204


def error_response(message, status_code=400, details=None):
    """Réponse JSON d'erreur standardisée."""
    body = {'error': message}
    if details is not None:
        body['details'] = details
    return jsonify(body), status_code


def validation_error_response(errors):
    """Réponse 422 pour erreurs de validation Marshmallow."""
    return jsonify({
        'error': 'Erreur de validation',
        'details': errors
    }), 422
