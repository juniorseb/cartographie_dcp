# 🚀 DÉMARRAGE RAPIDE - ARTCI DCP v2.2

## 📦 CONTENU DU PACKAGE

Ce projet contient la **base complète** pour démarrer le développement de la plateforme ARTCI DCP.

### Structure
```
artci-dcp-platform/
├── 📁 backend/              # API Flask Python
│   ├── config.py           # ✅ Configuration complète
│   ├── requirements.txt    # ✅ Toutes les dépendances
│   └── .env.example        # ✅ Variables d'environnement
│
├── 📁 frontend/             # Application React
│   ├── package.json        # ✅ Dépendances NPM
│   ├── tailwind.config.js  # ✅ Couleurs ARTCI configurées
│   ├── vite.config.ts      # ✅ Configuration Vite
│   └── src/
│       └── index.css       # ✅ Charte graphique ARTCI complète
│
└── 📁 docs/                 # Documentation
    ├── CONTEXT.md          # ✅ Contexte complet (25 tables, workflow, etc.)
    └── POUR_CLAUDE_CODE.md # ✅ Guide pour continuer avec Claude Code
```

---

## 🎨 CHARTE GRAPHIQUE DÉJÀ IMPLÉMENTÉE

### Couleurs Configurées
✅ **Orange ARTCI** : `#FF8C00` (boutons primaires, H1)  
✅ **Vert ARTCI** : `#228B22` (H2, succès, conformes)  
✅ **Noir** : `#000000` (texte principal)  
✅ **Blanc** : `#FFFFFF` (fond, cartes)  

### Styles CSS Prêts
- ✅ Boutons (primaire, secondaire, outline)
- ✅ Badges statuts (conforme, démarche achevée, en cours)
- ✅ Navbar standard ARTCI
- ✅ Cards, Tables, Forms
- ✅ Progress bars, Steppers
- ✅ Alerts, Loading spinners

**Fichiers** : 
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

---

## 📋 CE QUI EST PRÊT

### ✅ Configuration Backend
- Flask + SQLAlchemy + JWT configurés
- Variables d'environnement (.env.example)
- Config pour dev/prod/test
- Statuts, rôles, couleurs définis

### ✅ Configuration Frontend  
- React 18 + TypeScript + Vite
- Tailwind CSS avec couleurs ARTCI
- Routing, State management prévu
- Leaflet pour cartographie

### ✅ Documentation Complète
- **CONTEXT.md** : Tout le projet expliqué
  - 25 tables détaillées
  - Workflow 3 étapes
  - 36 pages d'interfaces
  - Charte graphique
  - Règles métier
  
- **POUR_CLAUDE_CODE.md** : Guide pas-à-pas
  - Priorités de développement
  - Code examples
  - Points critiques
  - Commandes de démarrage

---

## 🎯 PROCHAINES ÉTAPES (avec Claude Code)

### Étape 1 : Lire la Documentation
```bash
# Ouvrir ces 2 fichiers dans Claude Code
docs/CONTEXT.md           # Contexte complet
docs/POUR_CLAUDE_CODE.md  # Guide de développement
```

### Étape 2 : Setup Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Modifier .env avec vos credentials
```

### Étape 3 : Créer les 25 Modèles SQLAlchemy
Référence complète dans `docs/CONTEXT.md` section "BASE DE DONNÉES"

### Étape 4 : Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### Étape 5 : Développer les Pages
Priorités :
1. Interface Publique (5 pages)
2. Interface Entreprise (11 pages)  
3. Interface Admin (20 pages)

---

## 🔑 POINTS CRITIQUES À RESPECTER

### 1. Filtrage Carte Publique
```typescript
// IMPORTANT : Afficher UNIQUEMENT les conformes
const entitesConformes = entites.filter(e => 
  e.statut_conformite === 'Conforme' && 
  e.publie_sur_carte === true
);
```

### 2. Workflow 3 Étapes (pas 4)
1. Recensement
2. Vérification (+ feedbacks + délai)
3. Suivi activités (si conforme UNIQUEMENT)

### 3. Nouveaux Statuts v2.2
- ✅ **Conforme** (affiché sur carte)
- 🟠 **Démarche achevée** (NON affiché)
- 🔵 **Démarche en cours** (NON affiché)

### 4. OTP Obligatoire
- Inscription : Email + Code 6 chiffres
- Connexion sensible : Si nouvelle IP/navigateur

### 5. Validation Hiérarchique
Agent traite → N+1 valide → Entreprise notifiée

---

## 📚 RESSOURCES DISPONIBLES

### Dans `/mnt/user-data/outputs/`
- `MCD_COMPLET_V2.1_ARTCI.docx` : 22 tables (à mettre à jour → 25)
- `Cadrage_Plateforme_DCP_ARTCI_v2.1.docx` : Cahier des charges
- `Specifications_Interfaces_ARTCI_v2.1.docx` : 33 pages (à mettre à jour → 36)
- `Wireframes_Interfaces_ARTCI_v2.1.html` : Mockups HTML
- `Systeme_Rapprochement_ARTCI_v2.1.docx` : Doc rapprochement
- `MODIFICATIONS_REUNION_v2.2.md` : Nouveautés v2.2

---

## 🚀 COMMANDES RAPIDES

```bash
# Backend
cd backend
source venv/bin/activate
flask run  # Port 5000

# Frontend
cd frontend
npm run dev  # Port 5173

# Base de données
flask db migrate -m "Description"
flask db upgrade
```

---

## ✅ CHECKLIST AVANT DE COMMENCER

- [ ] Lire `docs/CONTEXT.md` en entier
- [ ] Lire `docs/POUR_CLAUDE_CODE.md`
- [ ] Installer PostgreSQL 14+ avec PostGIS
- [ ] Créer base de données `artci_dcp`
- [ ] Configurer `.env` avec vos credentials
- [ ] Installer dépendances backend (`pip install -r requirements.txt`)
- [ ] Installer dépendances frontend (`npm install`)
- [ ] Vérifier que les couleurs ARTCI sont dans `tailwind.config.js`

---

## 🎨 EXEMPLE D'UTILISATION DES STYLES

### Bouton Orange (Primaire)
```tsx
<button className="btn btn-primary">
  Soumettre
</button>
```

### Badge Conforme
```tsx
<span className="badge badge-conforme">
  Conforme
</span>
```

### Card avec Bordure Orange
```tsx
<div className="card card-orange">
  <h3>Titre</h3>
  <p>Contenu</p>
</div>
```

Tous les styles sont dans `frontend/src/index.css` !

---

## 📞 BESOIN D'AIDE ?

### Documentation
1. `docs/CONTEXT.md` → Vue d'ensemble complète
2. `docs/POUR_CLAUDE_CODE.md` → Guide développement
3. `frontend/src/index.css` → Tous les styles CSS
4. `backend/config.py` → Configuration Flask

### Fichiers de Référence
- Wireframes : `Wireframes_Interfaces_ARTCI_v2.1.html`
- Modifications v2.2 : `MODIFICATIONS_REUNION_v2.2.md`
- Spécifications : `Specifications_Interfaces_ARTCI_v2.1.docx`

---

**Le projet est prêt à démarrer ! 🚀**

Passez maintenant sur **Claude Code** avec le fichier `docs/POUR_CLAUDE_CODE.md` pour continuer.

---

**Version** : 2.2  
**Date** : Février 2026  
**Équipe** : ARTCI - Côte d'Ivoire
