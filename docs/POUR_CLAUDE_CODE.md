# 🤖 POUR CLAUDE CODE - DÉMARRAGE PROJET ARTCI DCP

## 📋 CE QUI EST DÉJÀ FAIT

### ✅ Structure Projet
```
artci-dcp-platform/
├── backend/           # Flask API
│   ├── config.py     # ✅ Configuration complète
│   ├── requirements.txt  # ✅ Dépendances
│   └── .env.example  # ✅ Variables d'environnement
├── frontend/         # React + Vite
│   ├── package.json  # ✅ Dépendances
│   ├── tailwind.config.js  # ✅ Couleurs ARTCI configurées
│   ├── vite.config.ts  # ✅ Configuration Vite
│   └── src/
│       └── index.css  # ✅ Charte graphique ARTCI complète
└── docs/
    ├── CONTEXT.md    # ✅ Contexte complet du projet
    └── POUR_CLAUDE_CODE.md  # ✅ Ce fichier
```

### ✅ Charte Graphique Implémentée
Toutes les couleurs ARTCI sont dans `tailwind.config.js` et `index.css` :
- Orange ARTCI : `#FF8C00`
- Vert ARTCI : `#228B22`
- Statuts : Conforme (vert), Démarche achevée (orange), Démarche en cours (bleu)

---

## 🎯 CE QU'IL RESTE À FAIRE (POUR CLAUDE CODE)

### PRIORITÉ 1 : Backend (Base de Données)

#### Étape 1 : Créer les 25 modèles SQLAlchemy
**Fichiers à créer** : `backend/app/models/`

**Liste des 25 tables** :
1. `comptes_entreprises.py` (15 colonnes)
2. `users.py` (11 colonnes)
3. `entites_base.py` (14 colonnes)
4. `entites_contact.py` (6 colonnes)
5. `entites_workflow.py` (14 colonnes)
6. `entites_localisation.py` (8 colonnes + PostGIS)
7. `entites_conformite.py` (8 colonnes)
8. `otp_codes.py` (7 colonnes) - NOUVEAU v2.2
9. `assignations_demandes.py` (9 colonnes) - NOUVEAU v2.2
10. `feedbacks_verification.py` (7 colonnes) - NOUVEAU v2.2
11. `demandes_rapprochement.py` (12 colonnes)
12-19. Tables DCP Form Data (8 tables)
20-23. Tables Security (4 tables)
24-25. Tables Workflow & Tracking (2 tables)

**Référence complète** : Voir `docs/CONTEXT.md` section "BASE DE DONNÉES"

#### Étape 2 : Créer l'application Flask
**Fichiers à créer** :
- `backend/app/__init__.py` : Factory Flask avec extensions
- `backend/app/extensions.py` : SQLAlchemy, JWT, CORS, Mail
- `backend/run.py` : Point d'entrée

#### Étape 3 : Migrations Alembic
```bash
flask db init
flask db migrate -m "Initial migration - 25 tables"
flask db upgrade
```

---

### PRIORITÉ 2 : API Routes de Base

#### Routes Authentification
**Fichier** : `backend/app/routes/auth.py`
- `POST /api/auth/register` : Inscription + Envoi OTP
- `POST /api/auth/verify-otp` : Vérification OTP
- `POST /api/auth/login` : Connexion
- `POST /api/auth/refresh` : Refresh token
- `POST /api/auth/logout` : Déconnexion

#### Routes Entités (Publiques)
**Fichier** : `backend/app/routes/entites_public.py`
- `GET /api/public/entites` : Liste entités **CONFORMES UNIQUEMENT**
- `GET /api/public/entites/:id` : Fiche détaillée
- `GET /api/public/stats` : Statistiques publiques
- `GET /api/public/export` : Export Excel/CSV/PDF

**IMPORTANT** : Filtrer sur `statut_conformite = 'Conforme'`

#### Routes Entités (Entreprise)
**Fichier** : `backend/app/routes/entites_entreprise.py`
- `POST /api/entreprise/demande` : Créer demande
- `GET /api/entreprise/mon-dossier` : Voir son dossier
- `PUT /api/entreprise/demande/:id` : Modifier demande
- `POST /api/entreprise/rapports` : Soumettre rapport

#### Routes Admin
**Fichier** : `backend/app/routes/admin.py`
- `GET /api/admin/panier` : Mon panier de demandes
- `GET /api/admin/validation-n1` : Demandes à valider
- `POST /api/admin/feedbacks` : Ajouter feedback
- `PUT /api/admin/assignation/:id` : Traiter demande

---

### PRIORITÉ 3 : Frontend (Interface Publique)

#### Page 1 : Carte Interactive
**Fichier** : `frontend/src/pages/public/Carte.tsx`

**Composants nécessaires** :
- `LeafletMap.tsx` : Carte avec Leaflet
- `MarkerCluster.tsx` : Clustering marqueurs
- `Popup.tsx` : Popup enrichie avec finalités

**Code clé** :
```typescript
// Filtrer UNIQUEMENT les conformes
const entitesConformes = entites.filter(e => 
  e.statut_conformite === 'Conforme' && 
  e.publie_sur_carte === true
);

// Marqueurs oranges
const markerIcon = L.divIcon({
  className: 'marker-orange',
  // ...
});
```

#### Page 2 : Liste Entités
**Fichier** : `frontend/src/pages/public/Liste.tsx`

**Colonnes (10)** :
1. Entité
2. Forme juridique
3. Secteur
4. Adresse
5. Ville
6. Point localisation (📍)
7. Finalité principale
8. CPD
9. Autorisation
10. Statut
11. Actions

#### Page 3 : Export Données
**Fonctionnalité** : Bouton export avec 3 formats
- Excel : `xlsx` library
- CSV : `papaparse`
- PDF : `jspdf`

---

### PRIORITÉ 4 : Frontend (Interface Entreprise)

#### Dashboard avec Workflow 3 Étapes
**Fichier** : `frontend/src/pages/entreprise/Dashboard.tsx`

**Stepper** :
```
[✓] Recensement → [●] Vérification → [ ] Suivi activités
```

**Conditions** :
- Étape 3 accessible **SEULEMENT si statut = "Conforme"**
- Si "Démarche achevée" ou "Démarche en cours" → Message bloquant

#### OTP Inscription/Connexion
**Fichiers** :
- `frontend/src/pages/entreprise/Inscription.tsx`
- `frontend/src/components/OTPInput.tsx`

**Workflow** :
1. Formulaire inscription
2. Envoi email avec code 6 chiffres
3. Saisie OTP
4. Validation et activation compte

---

### PRIORITÉ 5 : Frontend (Interface Admin)

#### Panier de Demandes
**Fichier** : `frontend/src/pages/admin/PanierDemandes.tsx`

**Colonnes** :
- Entreprise
- N° CC
- Date assignation
- **Échéance** (en rouge si dépassée)
- Statut
- Actions

**Alerte** : Badge rouge si échéance dépassée

#### Validation N+1
**Fichier** : `frontend/src/pages/admin/ValidationN1.tsx`

**Workflow** :
1. Liste demandes traitées par agents
2. Voir feedbacks agent
3. Approuver ou renvoyer à l'agent
4. Notification entreprise automatique

---

## 🎨 RÈGLES DE STYLE À RESPECTER

### Composants Boutons
```tsx
// Primaire (Orange)
<button className="btn btn-primary">Valider</button>

// Secondaire (Vert)
<button className="btn btn-secondary">Soumettre</button>

// Outline
<button className="btn btn-outline">Annuler</button>
```

### Badges Statuts
```tsx
{statut === 'Conforme' && (
  <span className="badge badge-conforme">Conforme</span>
)}
{statut === 'Démarche achevée' && (
  <span className="badge badge-achevee">Démarche achevée</span>
)}
{statut === 'Démarche en cours' && (
  <span className="badge badge-encours">Démarche en cours</span>
)}
```

### Navbar Standard
```tsx
<nav className="navbar-artci">
  <div className="logo">🏛️ ARTCI - DCP</div>
  <div className="nav-links">
    <Link to="/carte">Carte</Link>
    <Link to="/liste">Liste</Link>
  </div>
</nav>
```

---

## 📚 DOCUMENTS DE RÉFÉRENCE

### 1. Context Complet
**Fichier** : `docs/CONTEXT.md`
- Architecture globale
- 25 tables détaillées
- Workflow 3 étapes
- Charte graphique
- Tous les statuts

### 2. Modifications v2.2
**Fichier** : `/mnt/user-data/outputs/MODIFICATIONS_REUNION_v2.2.md`
- Nouveautés post-réunion
- OTP, Panier, Validation N+1
- Nouveaux statuts conformité

### 3. Wireframes
**Fichier** : `/mnt/user-data/outputs/Wireframes_Interfaces_ARTCI_v2.1.html`
- 31 pages mockups
- À adapter avec les modifications v2.2

### 4. Spécifications Interfaces
**Fichier** : `/mnt/user-data/outputs/Specifications_Interfaces_ARTCI_v2.1.docx`
- Description détaillée des 36 pages

---

## 🚀 COMMANDES DE DÉMARRAGE

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
cp .env.example .env
# Modifier .env avec vos valeurs
flask db init
flask db migrate
flask db upgrade
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## ⚠️ POINTS CRITIQUES

1. **Filtrage Carte** : UNIQUEMENT statut "Conforme"
2. **Workflow** : 3 étapes (pas 4)
3. **OTP** : Obligatoire inscription + connexion sensible
4. **Validation N+1** : Agent traite → N+1 valide → Entreprise notifiée
5. **Couleurs** : Respecter charte ARTCI (Orange, Vert, Noir)
6. **Statuts** : 3 nouveaux (Conforme, Démarche achevée, Démarche en cours)

---

## 📞 BESOIN D'AIDE ?

Consultez :
- `docs/CONTEXT.md` : Contexte complet
- `frontend/src/index.css` : Tous les styles
- `tailwind.config.js` : Couleurs configurées
- `backend/config.py` : Configuration Flask

---

**Bon développement ! 🚀**

**Version** : 2.2  
**Date** : Février 2026

---

## 🗄️ ALEMBIC - MIGRATIONS (NOUVEAU)

### ✅ Alembic est maintenant configuré !

**Fichiers créés** :
- `backend/alembic.ini` : Configuration Alembic
- `backend/migrations/env.py` : Environment
- `backend/migrations/script.py.mako` : Template
- `backend/migrations/versions/` : Dossier migrations
- `backend/ALEMBIC_GUIDE.md` : **Guide complet Alembic**

### Commandes de Base
```bash
# Créer une migration après avoir créé des modèles
flask db migrate -m "Description"

# Appliquer les migrations
flask db upgrade

# Annuler la dernière migration
flask db downgrade

# Voir l'historique
flask db history
```

### Workflow
1. Créer les 25 modèles dans `app/models/`
2. Les importer dans `app/models/__init__.py`
3. `flask db migrate -m "Create 25 initial tables"`
4. Vérifier le fichier généré dans `migrations/versions/`
5. `flask db upgrade`

**Documentation complète** : Voir `backend/ALEMBIC_GUIDE.md`

---
