"""
Extensions Flask pour ARTCI DCP Platform
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail

# SQLAlchemy
db = SQLAlchemy()

# Migrations Alembic
migrate = Migrate()

# JWT Authentication
jwt = JWTManager()

# CORS
cors = CORS()

# Email
mail = Mail()

# Token blacklist (in-memory pour dev, Redis en production)
token_blacklist = set()
