"""
Point d'entrée de l'application ARTCI DCP Platform
"""
import os
from app import create_app

# Déterminer l'environnement
env = os.getenv('FLASK_ENV', 'development')
app = create_app(env)

if __name__ == '__main__':
    # Lancer le serveur de développement
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )
