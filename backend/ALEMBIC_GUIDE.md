# 🗄️ GUIDE ALEMBIC - MIGRATIONS BASE DE DONNÉES

## ✅ CONFIGURATION COMPLÈTE

Alembic est maintenant **100% configuré** et prêt à l'emploi !

### Fichiers créés
```
backend/
├── alembic.ini              ✅ Configuration Alembic
├── migrations/
│   ├── env.py              ✅ Environment configuration
│   ├── script.py.mako      ✅ Template pour migrations
│   └── versions/           ✅ Dossier pour fichiers de migration
│       └── README.md
├── app/
│   ├── __init__.py         ✅ Factory Flask
│   ├── extensions.py       ✅ SQLAlchemy + Migrate
│   └── models/             ✅ Dossier pour 25 modèles
│       └── __init__.py
└── run.py                  ✅ Point d'entrée
```

---

## 🚀 COMMANDES ALEMBIC

### 1. Créer une nouvelle migration
```bash
# Après avoir créé/modifié des modèles SQLAlchemy
flask db migrate -m "Description de la migration"

# Exemple :
flask db migrate -m "Create 25 initial tables"
```

### 2. Appliquer les migrations
```bash
# Appliquer toutes les migrations en attente
flask db upgrade

# Appliquer jusqu'à une révision spécifique
flask db upgrade <revision_id>
```

### 3. Annuler une migration
```bash
# Revenir à la migration précédente
flask db downgrade

# Revenir à une révision spécifique
flask db downgrade <revision_id>
```

### 4. Voir l'historique
```bash
# Voir toutes les migrations
flask db history

# Voir la migration actuelle
flask db current

# Voir les migrations en attente
flask db heads
```

### 5. Créer une migration vide
```bash
# Pour des migrations personnalisées
flask db revision -m "Description"
```

---

## 📋 WORKFLOW COMPLET

### Étape 1 : Créer les modèles SQLAlchemy
Dans `app/models/`, créer les 25 tables (avec Claude Code).

**Exemple** : `app/models/comptes_entreprises.py`
```python
from app.extensions import db
from datetime import datetime

class CompteEntreprise(db.Model):
    __tablename__ = 'comptes_entreprises'
    
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    denomination = db.Column(db.String(255), nullable=False)
    numero_cc = db.Column(db.String(50), unique=True, nullable=False)
    # ... autres colonnes
    
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### Étape 2 : Importer les modèles
Dans `app/models/__init__.py` :
```python
from .comptes_entreprises import CompteEntreprise
from .users import User
from .entites_base import EntiteBase
# ... importer tous les modèles

__all__ = [
    'CompteEntreprise',
    'User',
    'EntiteBase',
    # ...
]
```

### Étape 3 : Générer la migration
```bash
flask db migrate -m "Create initial tables"
```

Cela crée un fichier dans `migrations/versions/` avec les commandes SQL.

### Étape 4 : Vérifier le fichier de migration
Ouvrir le fichier généré dans `migrations/versions/` et vérifier que tout est correct.

### Étape 5 : Appliquer la migration
```bash
flask db upgrade
```

---

## 🎯 MIGRATIONS PRÉVUES

### Migration 1 : Tables Principales (22 tables v2.1)
```bash
flask db migrate -m "Create 22 initial tables - Auth, Entities, DCP, Security, Workflow"
flask db upgrade
```

**Tables** :
- comptes_entreprises, users
- entites_base, entites_contact, entites_workflow, entites_localisation, entites_conformite
- demandes_rapprochement
- responsables_legaux, dpo, conformite_administrative, documents_joints
- registre_traitements, categories_donnees, finalites_bases_legales, sous_traitance
- transferts_internationaux, securite_conformite, mesures_securite, certifications_securite
- historique_statuts, renouvellements

### Migration 2 : Nouvelles Tables v2.2 (3 tables)
```bash
flask db migrate -m "Add v2.2 tables - OTP, Assignations, Feedbacks"
flask db upgrade
```

**Tables** :
- otp_codes
- assignations_demandes
- feedbacks_verification

### Migration 3 : Modifications v2.2
```bash
flask db migrate -m "Update conformity statuses and password fields"
flask db upgrade
```

**Modifications** :
- Modifier `statut_conformite` ENUM (3 nouvelles valeurs)
- Ajouter `password_last_changed` et `password_expires_at` à `comptes_entreprises`
- Ajouter `delai_mise_en_conformite` à `entites_conformite`

---

## ⚠️ IMPORTANT : PostGIS

Pour les colonnes géographiques dans `entites_localisation` :

```python
from geoalchemy2 import Geography

class EntiteLocalisation(db.Model):
    __tablename__ = 'entites_localisation'
    
    geolocation = db.Column(Geography('POINT', srid=4326))
    # ...
```

**Avant la première migration** :
```sql
-- Se connecter à PostgreSQL et activer PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## 🔧 DÉPANNAGE

### Erreur : "Can't locate revision identified by..."
```bash
# Supprimer l'historique Alembic et recommencer
flask db stamp head
```

### Erreur : "Target database is not up to date"
```bash
# Appliquer toutes les migrations en attente
flask db upgrade
```

### Conflit de migration
```bash
# Voir les branches
flask db branches

# Fusionner les branches
flask db merge <rev1> <rev2> -m "Merge migrations"
```

### Réinitialiser complètement
```bash
# ATTENTION : Supprime toutes les données !
# Supprimer toutes les tables
flask db downgrade base

# Réappliquer toutes les migrations
flask db upgrade
```

---

## 📚 RESSOURCES

### Documentation
- Flask-Migrate : https://flask-migrate.readthedocs.io/
- Alembic : https://alembic.sqlalchemy.org/
- GeoAlchemy2 : https://geoalchemy-2.readthedocs.io/

### Fichiers de Référence
- `docs/CONTEXT.md` : Description des 25 tables
- `backend/config.py` : Configuration base de données
- `migrations/env.py` : Configuration Alembic

---

## ✅ CHECKLIST

- [x] alembic.ini créé
- [x] migrations/env.py créé
- [x] migrations/script.py.mako créé
- [x] migrations/versions/ créé
- [x] app/__init__.py avec factory Flask
- [x] app/extensions.py avec db, migrate, jwt, cors, mail
- [x] run.py point d'entrée
- [x] Structure app/models/ prête

### À faire avec Claude Code
- [ ] Créer les 25 modèles SQLAlchemy
- [ ] Lancer `flask db migrate -m "Initial migration"`
- [ ] Lancer `flask db upgrade`
- [ ] Vérifier les tables dans PostgreSQL

---

**Alembic est prêt ! 🚀**

Passez maintenant sur Claude Code pour créer les 25 modèles SQLAlchemy.
