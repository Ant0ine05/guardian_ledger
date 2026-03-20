# Guardian Ledger

> Application Full-Stack de gestion d'inventaire pour Destiny 2.

Guardian Ledger permet aux joueurs de Destiny 2 de consulter et gérer leur inventaire en s'appuyant sur l'API officielle de Bungie.net. L'application interroge le manifeste local (SQLite) pour résoudre les définitions d'objets et authentifie les utilisateurs via le protocole OAuth 2.0.

---

## Technologies (Stack Technique)

| Couche       | Technologie                          |
|--------------|--------------------------------------|
| Frontend     | Vue.js 3 + Vue Router + Vite         |
| Backend      | Node.js 20+ avec Express 5           |
| BDD Manifeste | SQLite via `better-sqlite3` — définitions d'objets Bungie |
| BDD Joueurs  | SQLite — favoris et préférences des joueurs |
| Sécurité     | OAuth 2.0 (Bungie API)               |
| HTTP Client  | Axios                                |

---

## Prérequis

Assurez-vous d'avoir installé sur votre machine :

- **Node.js** v20.19.0 ou supérieur (`node --version`)
- **Git** pour le versionnage
- Un **compte Bungie.net** avec une application déclarée pour obtenir vos clés API (API Key, Client ID, Client Secret)  
  → [https://www.bungie.net/en/Application](https://www.bungie.net/en/Application)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Ant0ine05/guardian_ledger.git
cd guardian_ledger
```

### 2. Installer les dépendances

```bash
# Backend
cd src/backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## Configuration

Créez un fichier `.env` dans le dossier `src/backend/` à partir du modèle ci-dessous :

```env
PORT=3000
BUNGIE_API_KEY=votre_clé_api
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
```

> **Note :** Ne commitez jamais ce fichier. Il est (et doit rester) dans le `.gitignore`.

---

## Scripts de lancement

### Démarrer le backend

```bash
cd src/backend

# Mode production
npm start          # node server.js

# Mode développement (rechargement automatique)
npm run dev        # node --watch server.js
```

Le serveur écoute par défaut sur `http://localhost:3000`.

### Démarrer le frontend

```bash
cd src/frontend
npm run dev
```

L'interface est accessible sur `http://localhost:5173`.

---

## Architecture du projet

```
guardian_ledger/
├── src/
│   ├── backend/
│   │   ├── server.js           # Point d'entrée Express, middlewares et routes
│   │   ├── .env                # Variables d'environnement (non versionné)
│   │   ├── routes/
│   │   │   ├── routerAuth.js   # Flux OAuth 2.0 : /api/auth/login et /api/auth/callback
│   │   │   └── routerData.js   # API REST métier : /api/data/item/:hash
│   │   ├── services/
│   │   │   ├── bungieService.js     # Appels HTTP vers l'API Bungie.net (token Bearer)
│   │   │   └── manifestService.js   # Lecture du manifeste SQLite
│   │   └── data/
│   │       ├── manifest.db     # BDD SQLite — définitions d'objets Bungie
│   │       └── users.db        # BDD SQLite — favoris et préférences des joueurs
│   └── frontend/
│       ├── index.html
│       ├── vite.config.js
│       └── src/
│           ├── App.vue
│           ├── main.js
│           ├── router/         # Configuration Vue Router
│           └── views/
│               └── HomeView.vue
└── Readme.md
```

### Rôle des couches

| Dossier           | Responsabilité                                                          |
|-------------------|-------------------------------------------------------------------------|
| `src/backend`     | Serveur Express : point d'entrée, middlewares, configuration            |
| `/routes`         | Définit les points d'entrée de l'API REST et délègue aux services       |
| `/services`       | Logique métier : appels Bungie API et lecture SQLite                    |
| `/data`           | Stockage persistant : manifeste Bungie et BDD joueurs (favoris)         |
| `src/frontend`    | Interface Vue.js 3 : composants, vues et configuration Vite             |

---

## Points d'entrée API

| Méthode | Route                      | Description                                  |
|---------|----------------------------|----------------------------------------------|
| GET     | `/api/auth/login`          | Redirige vers la page d'autorisation Bungie  |
| GET     | `/api/auth/callback`       | Reçoit le code OAuth retourné par Bungie     |
| GET     | `/api/data/item/:hash`     | Retourne la définition d'un objet par hash   |

---

## Pipeline CI/CD *(optionnel)*

```bash
# Lancer les tests unitaires
npm test
```

> Les tests sont configurés via **Jest**. Le pipeline CI/CD est automatisé via **GitHub Actions** et déploie l'application à chaque push sur la branche `main`.  
> Lien de déploiement : *[à compléter selon l'hébergeur choisi]*

---

## Licence

ISC
