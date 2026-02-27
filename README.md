# 🏛️ PLATEFORME ARTCI DCP v2.2

Plateforme de Déclaration et Cartographie des Responsables de Traitement de Données Personnelles en Côte d'Ivoire.

## 📋 Vue d'ensemble

### 3 Interfaces
- **Interface Publique** (dcp-public.artci.ci) - 5 pages
- **Interface Entreprise** (dcp-entreprise.artci.ci) - 11 pages  
- **Interface Admin ARTCI** (dcp-admin.artci.ci) - 20 pages

### Stack Technique
- **Frontend**: React 18+ avec Vite, TypeScript, Tailwind CSS
- **Backend**: Flask 3.0 (Python), SQLAlchemy 2.0
- **Base de données**: PostgreSQL 14+ avec PostGIS
- **Cartographie**: Leaflet + OpenStreetMap

## 🎨 Charte Graphique ARTCI

### Couleurs principales
- **Orange ARTCI**: `#FF8C00` (boutons primaires, titres H1)
- **Vert ARTCI**: `#228B22` (titres H2, badges conformes)
- **Noir**: `#000000` (texte principal, titres H3)
- **Blanc**: `#FFFFFF` (fond, cartes)
- **Gris clair**: `#F5F5F5` (fond pages)

### Badges statuts
- **Conforme**: Badge vert `#228B22`
- **Démarche achevée**: Badge orange `#FF8C00`
- **Démarche en cours**: Badge bleu `#4A90E2`

## 📊 Architecture Base de Données

### 25 tables normalisées
- 2 tables Auth (comptes_entreprises, users)
- 5 tables Entités CORE
- 8 tables DCP Form Data
- 4 tables Security
- 3 tables Workflow & Tracking
- 3 tables Nouvelles v2.2 (otp_codes, assignations_demandes, feedbacks_verification)

## 🚀 Démarrage rapide

Voir `/docs/SETUP.md` pour les instructions d'installation complètes.

## 📚 Documentation

- `/docs/CONTEXT.md` - Contexte complet du projet
- `/docs/DATABASE.md` - Schéma base de données
- `/docs/API.md` - Documentation API
- `/docs/WIREFRAMES.md` - Spécifications interfaces

## 👥 Équipe

- **ARTCI** - Autorité de Régulation des Télécommunications de Côte d'Ivoire
- Conforme à la Loi N°2013-450

---
Version 2.2 - Février 2026
