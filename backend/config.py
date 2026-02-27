"""
Configuration Flask pour ARTCI DCP Platform
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration de base"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Database (Render donne postgres://, SQLAlchemy exige postgresql://)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 'postgresql://localhost/artci_dcp'
    ).replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    
    # CORS
    CORS_ORIGINS = [
        o.strip().rstrip('/') for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',') if o.strip()
    ]
    
    # Email
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@artci.ci')
    
    # OTP
    OTP_EXPIRATION_MINUTES = int(os.getenv('OTP_EXPIRATION_MINUTES', 10))
    OTP_LENGTH = int(os.getenv('OTP_LENGTH', 6))
    
    # File Upload
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 10485760))  # 10 MB
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'}
    
    # Security
    PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 8))
    PASSWORD_EXPIRY_DAYS = int(os.getenv('PASSWORD_EXPIRY_DAYS', 180))  # 6 mois
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Pagination
    ITEMS_PER_PAGE = int(os.getenv('ITEMS_PER_PAGE', 50))
    
    # Rate Limiting
    RATELIMIT_ENABLED = os.getenv('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', '100 per hour')
    
    # Statuts de conformité (NOUVEAUX v2.2)
    STATUTS_CONFORMITE = [
        'Conforme',
        'Démarche achevée',
        'Démarche en cours'
    ]
    
    # Statuts workflow
    STATUTS_WORKFLOW = [
        'brouillon',
        'brouillon_artci',
        'soumis',
        'en_verification',
        'en_attente_complements',
        'conforme',
        'conforme_sous_reserve',
        'valide',
        'rejete',
        'publie'
    ]
    
    # Origines de saisie
    ORIGINES_SAISIE = [
        'auto_recensement',
        'saisie_artci',
        'rapprochement'
    ]
    
    # Rôles RBAC
    ROLES = {
        'super_admin': {'label': 'Super Admin', 'color': '#DC143C'},
        'admin': {'label': 'Admin', 'color': '#FF8C00'},
        'editor': {'label': 'Éditeur', 'color': '#228B22'},
        'reader': {'label': 'Lecteur', 'color': '#666666'}
    }

class DevelopmentConfig(Config):
    """Configuration développement"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """Configuration production"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Configuration tests"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://localhost/artci_dcp_test'

# Dictionnaire des configurations
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
