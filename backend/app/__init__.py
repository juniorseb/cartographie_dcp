"""
Factory Flask pour ARTCI DCP Platform
"""
from flask import Flask
from config import config
from app.extensions import db, jwt, cors, mail, migrate

def create_app(config_name='default'):
    """
    Création de l'application Flask avec configuration
    
    Args:
        config_name: Nom de la configuration ('development', 'production', 'testing')
    
    Returns:
        Flask app instance
    """
    app = Flask(__name__)
    
    # Charger la configuration
    app.config.from_object(config[config_name])
    
    # Initialiser les extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config['CORS_ORIGINS'])
    mail.init_app(app)

    # JWT blocklist loader : vérifie si un token est blacklisté
    from app.extensions import token_blacklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload['jti']
        return jti in token_blacklist

    # Enregistrer les 25 modèles SQLAlchemy avec le metadata
    with app.app_context():
        from app import models  # noqa: F401

    # Enregistrer les blueprints (routes)
    register_blueprints(app)
    
    # Gestionnaires d'erreurs
    register_error_handlers(app)
    
    # Context processors
    @app.shell_context_processor
    def make_shell_context():
        """Context pour flask shell"""
        return {
            'db': db,
            'app': app
        }
    
    return app

def register_blueprints(app):
    """Enregistrer les 4 blueprints API."""
    from app.routes import auth_bp, public_bp, entreprise_bp, admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(public_bp, url_prefix='/api/public')
    app.register_blueprint(entreprise_bp, url_prefix='/api/entreprise')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

def register_error_handlers(app):
    """Gestionnaires d'erreurs globaux"""
    
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(400)
    def bad_request(error):
        return {'error': 'Bad request'}, 400
