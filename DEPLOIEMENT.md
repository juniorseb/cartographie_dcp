# Déploiement — Cartographie DCP (ARTCI)

Architecture de déploiement :

- **Backend (Flask + PostgreSQL)** → **Render** (fichier `render.yaml`)
- **Frontend (React + Vite)** → **Vercel** (fichier `frontend/vercel.json`)
- **Code source** → GitHub : `https://github.com/juniorseb/cartographie_dcp` (branche `main`)

Les deux plateformes sont en **auto-déploiement** : chaque `git push` sur `main`
déclenche un nouveau build du backend (Render) et du frontend (Vercel).

---

## 1. Déploiement courant (à chaque mise à jour)

C'est le cas le plus fréquent : le projet est déjà configuré sur Render et Vercel.

```bash
# 1. Vérifier que le frontend build (évite un échec côté Vercel)
cd frontend
npm run build          # doit se terminer par "✓ built"

# 2. Revenir à la racine et committer
cd ..
git add -A
git status             # vérifier qu'aucun fichier sensible n'est ajouté
git commit -m "feat: <description des changements>"

# 3. Pousser → déclenche les déploiements Render + Vercel
git push origin main
```

À la réception du push :

- **Render** exécute `backend/start.sh` :
  1. `flask db upgrade` (applique les migrations sur la **base de production**)
  2. `python seed.py` (seed si tables vides — doit rester idempotent)
  3. `gunicorn run:app`
- **Vercel** rebuild le frontend depuis `main`.

> ⚠️ Ne jamais committer : `backend/.env`, les fichiers de `backend/uploads/audits|dpo|rapports|inscriptions/`
> (données personnelles). Ils sont déjà dans `.gitignore`.

---

## 2. Variables d'environnement

### 2.1 Backend — Render (service `artci-dcp-api`)

**Fournies automatiquement par `render.yaml`** (rien à faire) :

| Variable | Source |
|---|---|
| `DATABASE_URL` | base Render `artci-dcp-db` |
| `SECRET_KEY` | générée |
| `JWT_SECRET_KEY` | générée |
| `FLASK_ENV` | `production` |
| `PYTHON_VERSION` | `3.11.6` |

**À renseigner MANUELLEMENT dans le dashboard Render** (Settings → Environment),
car absentes de `render.yaml` :

| Variable | Valeur |
|---|---|
| `CORS_ORIGINS` | l'URL Vercel du frontend, ex. `https://cartographie-dcp.vercel.app` |
| `FRONTEND_URL` | idem (liens dans les emails) |
| `MAIL_SERVER` | `smtp.zoho.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USE_TLS` | `True` |
| `MAIL_USE_SSL` | `False` |
| `MAIL_USERNAME` | `noreply@emploirapide.net` |
| `MAIL_PASSWORD` | (mot de passe SMTP) |
| `MAIL_DEFAULT_SENDER` | `noreply@emploirapide.net` |
| `MAIL_SUPPRESS_SEND` | `False` |
| `MAIL_TIMEOUT` | `15` |

> Sans les variables `MAIL_*`, l'envoi d'emails (inscription, vérification, etc.)
> ne fonctionnera pas en production.

### 2.2 Frontend — Vercel

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | URL du backend Render **+ `/api`**, ex. `https://artci-dcp-api.onrender.com/api` |

> Le frontend appelle des chemins comme `/entreprise/dashboard` ; le préfixe `/api`
> doit donc être inclus dans `VITE_API_URL`. Après modification d'une variable Vercel,
> **redéclencher un build** (Vercel ne rebuild pas tout seul sur un simple changement d'env).

---

## 3. Configuration initiale (référence — déjà faite)

### 3.1 Backend sur Render

1. Render → **New** → **Blueprint** → connecter le repo GitHub `cartographie_dcp`.
2. Render lit `render.yaml` : il crée la base PostgreSQL `artci-dcp-db` et le service web `artci-dcp-api`.
3. Renseigner les variables manuelles de la section **2.1** (CORS_ORIGINS, FRONTEND_URL, MAIL_*).
4. Déployer. Vérifier les logs : migrations appliquées + Gunicorn démarré.
5. Noter l'URL publique du service (ex. `https://artci-dcp-api.onrender.com`).

### 3.2 Frontend sur Vercel

1. Vercel → **Add New** → **Project** → importer le repo `cartographie_dcp`.
2. **Root Directory** = `frontend`.
3. Framework détecté : **Vite**. Build = `npm run build`, Output = `dist`.
4. Ajouter la variable `VITE_API_URL` (section **2.2**) avec l'URL Render + `/api`.
5. Déployer. Le `vercel.json` gère le rewrite SPA (toutes les routes → `index.html`).

---

## 4. Vérifications après déploiement

- [ ] Render : build vert, logs sans erreur, migrations OK.
- [ ] Vercel : build vert, site accessible.
- [ ] Page d'accueil publique se charge (pas d'erreur 500 / CORS).
- [ ] Connexion entreprise et admin fonctionnelles.
- [ ] Un email de test (inscription) est bien reçu (sinon → vérifier `MAIL_*` sur Render).
- [ ] La carte publique affiche les entités publiées.

---

## 5. Dépannage rapide

| Symptôme | Cause probable | Action |
|---|---|---|
| Erreur CORS dans la console | `CORS_ORIGINS` ≠ URL Vercel | corriger sur Render, redeploy |
| 500 sur tous les appels API | backend down / migration échouée | logs Render |
| Appels API en 404 | `VITE_API_URL` sans `/api` | corriger sur Vercel, rebuild |
| Emails non reçus | `MAIL_*` absentes/incorrectes | renseigner sur Render |
| Backend lent au 1er appel | plan Render **free** (mise en veille) | normal, ou passer en plan payant |
