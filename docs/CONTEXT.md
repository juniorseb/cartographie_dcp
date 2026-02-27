# 📘 CONTEXTE COMPLET DU PROJET ARTCI DCP v2.2

## 🎯 OBJECTIF DU PROJET

Créer une plateforme web complète pour la **Déclaration et Cartographie des Responsables de Traitement de Données Personnelles** en Côte d'Ivoire, conforme à la Loi N°2013-450.

---

## 🏗️ ARCHITECTURE GLOBALE

### 3 Applications Web Distinctes

#### 1. Interface Publique (dcp-public.artci.ci)
**5 pages | Accès anonyme**
- Carte interactive (Leaflet + OpenStreetMap)
- Fiche détaillée entité
- Liste des entités (10 colonnes)
- Statistiques publiques
- À propos / Contact

**Particularité** : Affiche UNIQUEMENT les entités avec statut "Conforme"

#### 2. Interface Entreprise (dcp-entreprise.artci.ci)
**11 pages | Authentification JWT + OTP**
- Inscription / Connexion (OTP obligatoire)
- Dashboard (workflow 3 étapes)
- Mon Dossier
- Formulaire 50 questions (5 parties)
- **Onglet Demandes** (Nouvelle demande, Renouvellement)
- Mes Rapports d'Activité
- Mon Renouvellement
- Mes Audits
- Mon Profil

**Workflow entreprise (3 étapes)** :
1. **Recensement** - Remplir formulaire + Upload docs
2. **Vérification** - ARTCI vérifie + Feedbacks + Délai conformité
3. **Suivi activités** - Uniquement si statut = "Conforme"

#### 3. Interface Admin ARTCI (dcp-admin.artci.ci)
**20 pages | RBAC 4 rôles**
- Dashboard Admin
- **Mon Panier de Demandes** (avec échéances)
- **Validation N+1** (hiérarchique)
- Liste Entités
- Formulaire Multi-Étapes (saisie ARTCI)
- Validation Demandes Auto-recensement
- Import Excel
- Gestion Utilisateurs (RBAC)
- Statistiques avancées (avec filtres période)
- Rapports, Audits, Logs, Paramètres

---

## 🎨 CHARTE GRAPHIQUE ARTCI

### Couleurs Officielles
```css
/* Couleurs principales */
--artci-orange: #FF8C00;  /* Boutons primaires, H1, Navbar bordure */
--artci-green: #228B22;   /* H2, Badges conformes, Succès */
--artci-black: #000000;   /* Texte principal, H3 */
--artci-white: #FFFFFF;   /* Fond, Cartes */
--artci-gray-light: #F5F5F5; /* Fond pages */
--artci-gray: #666666;    /* Texte secondaire */

/* Statuts conformité */
--status-conforme: #228B22;        /* Vert */
--status-demarche-achevee: #FF8C00; /* Orange */
--status-demarche-en-cours: #4A90E2; /* Bleu */
--status-rejete: #DC143C;          /* Rouge */
```

### Typographie
```css
font-family: 'Arial', sans-serif;

/* Tailles */
H1: 32px, bold, color: #FF8C00
H2: 28px, bold, color: #228B22
H3: 24px, bold, color: #000000
Body: 16px, color: #000000
Small: 14px, color: #666666
```

### Navbar Standard
```
Fond: Blanc (#FFFFFF)
Texte: Noir (#000000)
Bordure inférieure: Orange 3px (#FF8C00)
Hover: Fond orange, Texte blanc
```

### Boutons
```css
/* Primaire */
background: #FF8C00;
color: #FFFFFF;
border-radius: 4px;
padding: 12px 24px;

/* Secondaire */
background: #228B22;
color: #FFFFFF;

/* Outline */
background: transparent;
border: 2px solid #FF8C00;
color: #FF8C00;
hover: background #FF8C00, color #FFFFFF
```

### Badges Statuts
```css
/* Conforme */
background: #228B22;
color: #FFFFFF;

/* Démarche achevée */
background: #FF8C00;
color: #FFFFFF;

/* Démarche en cours */
background: #4A90E2;
color: #FFFFFF;

/* Rejeté */
background: #DC143C;
color: #FFFFFF;
```

---

## 🗄️ BASE DE DONNÉES (25 TABLES)

### Tables par Groupe

#### GROUPE 1 : AUTH (2 tables)
1. **comptes_entreprises** (15 colonnes)
   - id, email, password_hash, denomination, numero_cc
   - telephone, adresse, ville, region
   - email_verified, is_active
   - password_last_changed, password_expires_at (NOUVEAU v2.2)
   - createdAt, updatedAt

2. **users** (11 colonnes - Personnel ARTCI)
   - id, nom, prenom, email, password_hash
   - role (super_admin, admin, editor, reader)
   - telephone, is_active, last_login
   - createdAt, updatedAt

#### GROUPE 2 : ENTITÉS CORE (5 tables)
3. **entites_base** (14 colonnes)
   - id, compte_entreprise_id (NULLABLE), numero_cc (UNIQUE)
   - denomination, forme_juridique, secteur_activite
   - adresse, ville, region, telephone, email
   - origine_saisie (auto_recensement, saisie_artci, rapprochement)
   - publie_sur_carte (BOOLEAN)
   - createdAt, updatedAt

4. **entites_contact** (6 colonnes)
   - entite_id, responsable_legal_nom, responsable_legal_fonction
   - responsable_legal_email, responsable_legal_telephone
   - site_web

5. **entites_workflow** (14 colonnes)
   - entite_id, statut (brouillon, soumis, en_verification, valide, publie, rejete)
   - numero_autorisation_artci, date_soumission, date_validation
   - date_publication, date_rejet, motif_rejet
   - createdBy (FK users), assignedTo (FK users)
   - createdAt, updatedAt

6. **entites_localisation** (8 colonnes - PostGIS)
   - entite_id, latitude, longitude, geolocation (POINT)
   - precision_gps, methode_geolocalisation
   - adresse_complete, code_postal

7. **entites_conformite** (8 colonnes)
   - entite_id, score_conformite (0-100)
   - statut_conformite (Conforme, Démarche achevée, Démarche en cours)
   - a_dpo (BOOLEAN), type_dpo (interne/externe)
   - effectif_entreprise, volume_donnees_traitees
   - delai_mise_en_conformite (DATE - NOUVEAU v2.2)

#### GROUPE 3 : NOUVELLES TABLES v2.2 (3 tables)
8. **otp_codes** (7 colonnes - NOUVEAU)
   - id, compte_entreprise_id (FK)
   - code (VARCHAR 6), type (inscription, connexion, reset_password)
   - expires_at, used (BOOLEAN)
   - createdAt

9. **assignations_demandes** (9 colonnes - NOUVEAU)
   - id, entite_id (FK), agent_id (FK users)
   - date_assignation, echeance (DATE limite traitement)
   - statut (en_cours, traite_attente_validation, valide, en_retard)
   - traite_le, valide_par (FK users), valide_le

10. **feedbacks_verification** (7 colonnes - NOUVEAU)
    - id, entite_id (FK), agent_id (FK users)
    - date_feedback, commentaires (TEXT)
    - elements_manquants (JSONB)
    - delai_fourniture (DATE)

#### GROUPE 4 : RAPPROCHEMENT (1 table)
11. **demandes_rapprochement** (12 colonnes)
    - id, entite_id (FK), compte_entreprise_id (FK)
    - email_demandeur, numero_cc
    - document_preuve_path, raison_demande
    - statut (en_attente, approuve, rejete)
    - traite_par (FK users), date_traitement
    - commentaire_artci, createdAt

#### GROUPE 5 : DCP FORM DATA (8 tables)
12-19. responsables_legaux, dpo, conformite_administrative, documents_joints, registre_traitements, categories_donnees, finalites_bases_legales, sous_traitance

#### GROUPE 6 : SECURITY (4 tables)
20-23. transferts_internationaux, securite_conformite, mesures_securite, certifications_securite

#### GROUPE 7 : WORKFLOW & TRACKING (2 tables)
24. historique_statuts, 25. renouvellements

---

## 🔐 SYSTÈME D'AUTHENTIFICATION

### OTP (One-Time Password) - NOUVEAU v2.2
- **Inscription** : Email avec code 6 chiffres, expiration 10min
- **Connexion sensible** : Si nouvelle IP, nouveau navigateur, >30j sans connexion
- Table `otp_codes` : stockage temporaire des codes

### JWT (JSON Web Tokens)
- Access token : 15 minutes
- Refresh token : 7 jours
- Stockage : localStorage (frontend)

### RBAC (Role-Based Access Control) - Admin
4 rôles :
- **Super Admin** (rouge) : Accès total
- **Admin** (orange) : CRUD entités + validation
- **Éditeur** (vert) : Créer/modifier entités
- **Lecteur** (gris) : Lecture seule

### Sécurité Mots de Passe
- **Changement obligatoire tous les 6 mois** (NOUVEAU v2.2)
- Alertes : 15j, 7j avant expiration
- Blocage connexion si non fait
- Bcrypt pour hashing
- Min 8 caractères, majuscule, minuscule, chiffre, caractère spécial

---

## 📋 WORKFLOW COMPLET (3 ÉTAPES)

### ÉTAPE 1 : RECENSEMENT
**Acteur** : Entreprise OU Agent ARTCI

**Actions** :
- Remplir formulaire 50 questions (5 parties)
- Upload documents (CNI, Registre commerce, etc.)
- Géolocalisation assistée (carte cliquable)
- Sauvegarde auto brouillon (30s)

**Statuts** : `brouillon` → `soumis` (si auto-recensement)

### ÉTAPE 2 : VÉRIFICATION (ENRICHIE v2.2)
**Acteur** : Agent ARTCI + N+1

**Sous-étapes** :
1. **Assignation** : Demande assignée à agent → Apparaît dans "Mon Panier"
2. **Vérification** : Agent vérifie dossier + Visite sur site
3. **Feedbacks** : Agent ajoute commentaires + Éléments manquants
4. **Délai conformité** : Si besoin, définir date limite compléments
5. **Validation N+1** : Responsable valide avant envoi entreprise

**Statuts possibles** :
- `en_verification` : Vérification en cours
- `en_attente_complements` : Compléments demandés
- `conforme` : ✅ Conforme immédiatement
- `conforme_sous_reserve` : ✅ Conforme avec délai compléments
- `rejete` : ❌ Non conforme

**Nouveautés v2.2** :
- **Panier de demandes** : Avec échéances de traitement
- **Feedbacks structurés** : Commentaires + Éléments manquants (JSONB)
- **Délai mise en conformité** : Date programmée pour compléments
- **Validation hiérarchique** : Agent traite → N+1 valide → Entreprise notifiée

### ÉTAPE 3 : SUIVI ACTIVITÉS
**Condition** : **UNIQUEMENT si statut = "Conforme"**

**Acteur** : Entreprise

**Actions** :
- Soumettre rapports d'activité (trimestriel, semestriel, annuel)
- Demander renouvellement (3 mois avant expiration)
- Gérer audits (planifiés, inopinés)

**Si "Démarche achevée" ou "Démarche en cours"** :
- Pas d'accès au suivi
- Message : "Disponible après validation conformité"

---

## 🗺️ CARTOGRAPHIE (LEAFLET)

### Configuration Carte Publique
```javascript
// IMPORTANT : Filtrage automatique
// N'afficher QUE les entités avec statut_conformite = 'Conforme'

const conformesOnly = entites.filter(e => 
  e.statut_conformite === 'Conforme' && 
  e.publie_sur_carte === true
);

// Marqueurs oranges (#FF8C00)
// Clustering si > 1000 entités
// Popup enrichie avec finalités en %
```

### Popup Marqueur (enrichie v2.2)
```
┌─────────────────────────────────────┐
│ ENTREPRISE A                        │
│ Télécommunications                  │
│ Abidjan, Cocody                     │
│                                     │
│ Statut : Conforme                   │
│                                     │
│ Finalités de traitement :           │
│ • Gestion clientèle : 45%           │
│ • Marketing : 30%                   │
│ • Facturation : 25%                 │
│                                     │
│ [Voir Détails]                      │
└─────────────────────────────────────┘
```

---

## 📊 LISTE DES ENTITÉS (10 COLONNES)

### Ordre des Colonnes v2.2
1. **Entité** (dénomination)
2. Forme juridique
3. Secteur d'activité
4. Adresse
5. Ville
6. **Point de localisation** (📍 cliquable → Google Maps)
7. Finalité principale
8. CPD (Oui/Non)
9. Autorisation ARTCI
10. Statut
11. **Actions** (Voir détails)

### Export Données Publiques (NOUVEAU v2.2)
- **Formats** : Excel, CSV, PDF
- **Contenu** : Toutes colonnes du tableau
- **Filtrage** : Uniquement entités conformes
- **Métadonnées** : Date export, Total, Filtres

---

## 📱 FORMULAIRE 50 QUESTIONS (5 PARTIES)

### Partie 1 : Identification (Q1-Q4)
- Statut juridique, Dénomination, Siège social, GPS

### Partie 2 : Conformité Administrative (Q5-Q13)
- Connaissance loi, DPO, Formalités ARTCI

### Partie 3 : Registre Traitements (Q14-Q25)
- Registre, Catégories données, Finalités

### Partie 4 : Sous-traitance (Q26-Q38)
- Sous-traitants, Transferts internationaux

### Partie 5 : Sécurité (Q39-Q50)
- Politique sécurité, Violations, Formations, Audits

### Fonctionnalités
- **Stepper visuel** : 5 étapes avec progression
- **Barre progression** : "60% (30/50 questions)"
- **Sauvegarde auto** : Toutes les 30 secondes
- **Géolocalisation assistée** : Carte cliquable
- **Validation temps réel** : Champs obligatoires
- **Upload documents** : Drag & drop, 10 MB max
- **Calcul auto score** : À la fin du formulaire

---

## 🎯 STATUTS DE CONFORMITÉ (3 NOUVEAUX v2.2)

### Anciens statuts (v2.1) ❌
- Conforme
- Partiellement conforme
- Non-conforme

### Nouveaux statuts (v2.2) ✅
1. **Conforme** 
   - Badge vert #228B22
   - Affiché sur carte publique
   - Accès au suivi activités

2. **Démarche achevée**
   - Badge orange #FF8C00
   - NON affiché sur carte
   - Pas d'accès suivi activités

3. **Démarche en cours**
   - Badge bleu #4A90E2
   - NON affiché sur carte
   - Pas d'accès suivi activités

---

## 📈 STATISTIQUES & FILTRES

### Mini-Stats Carte (v2.2)
```
1,234           450              320
Entités      Démarche         Démarche
Recensées    Achevée          En cours
```

### Filtres de Période (NOUVEAU v2.2)
Tous les graphiques Admin ont des filtres :
- Aujourd'hui
- Cette semaine
- Ce mois
- Ce trimestre
- Cette année
- Période personnalisée (date début - fin)

### Graphiques Disponibles
- Évolution mensuelle (courbe)
- Répartition par secteur (camembert)
- Demandes traitées (barres)
- Taux conformité par région (heatmap)

---

## 🔔 NOTIFICATIONS AUTOMATIQUES

### 15 Types d'Emails
1. Compte créé (avec OTP)
2. Connexion sensible (OTP)
3. Dossier soumis
4. Dossier assigné à agent
5. **Feedbacks agent disponibles** (NOUVEAU v2.2)
6. Demande compléments
7. **Échéance assignation proche** (NOUVEAU v2.2)
8. Dossier validé
9. Dossier rejeté (avec motif)
10. Dossier publié
11. Renouvellement (3 mois, 1 mois)
12. Agrément expiré
13. Rapport activité validé
14. Audit programmé
15. **Mot de passe expire bientôt** (NOUVEAU v2.2)

---

## 🛠️ STACK TECHNIQUE DÉTAILLÉ

### Frontend (React + TypeScript)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "axios": "^1.6.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "date-fns": "^3.0.0",
    "zustand": "^4.4.0"
  }
}
```

### Backend (Flask + Python)
```python
# requirements.txt
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-JWT-Extended==4.5.3
Flask-CORS==4.0.0
Flask-Mail==0.9.1
psycopg2-binary==2.9.9
GeoAlchemy2==0.14.2
marshmallow==3.20.1
python-dotenv==1.0.0
bcrypt==4.1.2
Pillow==10.1.0
pandas==2.1.4
openpyxl==3.1.2
```

### Base de Données
- PostgreSQL 14+
- Extensions : PostGIS, pg_trgm, uuid-ossp

---

## 📂 STRUCTURE DU PROJET

```
artci-dcp-platform/
├── backend/                 # API Flask
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/         # SQLAlchemy models (25 tables)
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Marshmallow schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helpers
│   ├── migrations/         # Alembic
│   ├── config.py
│   └── run.py
├── frontend/               # React + Vite
│   ├── public/
│   │   └── assets/
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # 36 pages
│   │   │   ├── public/   # 5 pages
│   │   │   ├── entreprise/ # 11 pages
│   │   │   └── admin/    # 20 pages
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API calls
│   │   ├── store/        # Zustand store
│   │   ├── utils/        # Helpers
│   │   └── types/        # TypeScript types
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docs/                  # Documentation
│   ├── CONTEXT.md        # Ce fichier
│   ├── DATABASE.md       # Schéma détaillé
│   ├── API.md            # Endpoints
│   └── WIREFRAMES.md     # Spécifications UI
├── uploads/              # Fichiers uploadés
└── README.md
```

---

## 🎯 PRIORITÉS DE DÉVELOPPEMENT

### Phase 1 : Setup & Backend (Semaine 1-2)
1. ✅ Créer structure projet
2. ✅ Configurer PostgreSQL + PostGIS
3. ✅ Créer les 25 modèles SQLAlchemy
4. ✅ Migrations Alembic
5. ✅ API REST (CRUD basique)
6. ✅ Auth (JWT + OTP)

### Phase 2 : Interface Publique (Semaine 3)
1. ✅ Carte Leaflet (filtrage conformes)
2. ✅ Liste entités (10 colonnes)
3. ✅ Export données (Excel, CSV, PDF)
4. ✅ Statistiques
5. ✅ Fiche détaillée

### Phase 3 : Interface Entreprise (Semaine 4)
1. ✅ Inscription + OTP
2. ✅ Dashboard (workflow 3 étapes)
3. ✅ Formulaire 50 questions
4. ✅ Onglet Demandes
5. ✅ Rapports, Renouvellement, Profil

### Phase 4 : Interface Admin (Semaine 5)
1. ✅ Dashboard Admin
2. ✅ Panier de demandes
3. ✅ Validation N+1
4. ✅ Feedbacks vérification
5. ✅ Gestion utilisateurs RBAC

### Phase 5 : Tests & Déploiement (Semaine 6)
1. ✅ Tests unitaires
2. ✅ Tests intégration
3. ✅ Déploiement production
4. ✅ Formation utilisateurs

---

## 🚨 POINTS CRITIQUES À RESPECTER

### 1. Charte Graphique
- ✅ Orange #FF8C00 pour boutons primaires
- ✅ Vert #228B22 pour succès
- ✅ Navbar blanche avec bordure orange

### 2. Filtrage Carte
- ✅ **UNIQUEMENT entités "Conforme"** affichées
- ✅ Ne PAS afficher "Démarche achevée" ni "Démarche en cours"

### 3. Workflow 3 Étapes
- ✅ Recensement → Vérification → Suivi activités
- ✅ Étape 3 accessible UNIQUEMENT si "Conforme"

### 4. OTP Obligatoire
- ✅ Inscription : Email avec code 6 chiffres
- ✅ Connexion sensible : Nouvelle IP, nouveau navigateur

### 5. Validation Hiérarchique
- ✅ Agent traite → N+1 valide → Entreprise notifiée
- ✅ Pas de notification directe entreprise sans validation N+1

### 6. Panier de Demandes
- ✅ Échéances de traitement visibles
- ✅ Alerte si échéance dépassée

### 7. Changement Mot de Passe
- ✅ Obligatoire tous les 6 mois
- ✅ Blocage connexion si non fait

---

## 📞 CONTACT & SUPPORT

**ARTCI** - Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire  
Conforme à la Loi N°2013-450 relative à la protection des données à caractère personnel

---

**Version** : 2.2  
**Date** : Février 2026  
**Statut** : En développement
