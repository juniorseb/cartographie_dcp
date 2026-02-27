"""
Registry des blueprints Flask pour ARTCI DCP Platform.
4 blueprints : auth, public, entreprise, admin.
"""
from app.routes.auth import auth_bp
from app.routes.public import public_bp
from app.routes.entreprise import entreprise_bp
from app.routes.admin import admin_bp

__all__ = ['auth_bp', 'public_bp', 'entreprise_bp', 'admin_bp']
