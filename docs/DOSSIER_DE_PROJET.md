# Dossier de Projet

---

# Guardian Ledger

### Application Full-Stack de gestion d'inventaire Destiny 2

**Projet personnel — Formation Concepteur Développeur d'Applications**

**Dalstein Antoine**

---

## Remerciements

Je tiens à adresser mes sincères remerciements à toutes les personnes qui ont contribué, de près ou de loin, à la réalisation de ce projet et à l'aboutissement de ma formation.

Je remercie en premier lieu **l'équipe pédagogique de l'école IT** pour la qualité de l'enseignement dispensé tout au long de la formation Concepteur Développeur d'Applications. Leurs retours, leur disponibilité et leur exigence m'ont permis de progresser régulièrement et d'aborder ce projet avec les bases solides nécessaires.

Je remercie également **l'entreprise Horloges-Huchez** et l'ensemble de mon équipe d'alternance pour m'avoir accordé leur confiance et pour m'avoir permis de mettre en pratique mes compétences en situation professionnelle réelle. Cette expérience en alternance a considérablement enrichi ma vision du développement logiciel et m'a appris à travailler dans un contexte d'équipe avec des contraintes concrètes.

Enfin, je remercie ma famille et mes proches pour leur soutien constant durant cette période de formation.

---

## I. Introduction

### Parcours

Je m'appelle **Dalstein Antoine**. Après l'obtention de mon **BTS SIO option SLAM** (Services Informatiques aux Organisations — Solutions Logicielles et Applications Métiers), j'ai souhaité approfondir mes compétences en développement logiciel en intégrant la formation **Concepteur Développeur d'Applications** à l'**École IT**, en alternance au sein de l'entreprise **Horloges-Huchez**.

Mon BTS SIO m'a apporté les fondamentaux du développement : algorithmique, bases de données relationnelles, développement web côté client et serveur, et premières notions de gestion de projet. La formation CDA m'a permis de franchir une nouvelle étape en me confrontant à des architectures plus complexes, à la conception orientée objet, aux bonnes pratiques de tests et à la démarche DevOps.

### Contexte du projet

Guardian Ledger est né d'une double passion : le développement web et le jeu vidéo **Destiny 2**. L'objectif était de concevoir et développer, dans le cadre de ma formation CDA, une application full-stack complète et fonctionnelle permettant aux joueurs de Destiny 2 de consulter et gérer leur inventaire depuis un navigateur web, via l'API officielle de Bungie.net.

Le choix de ce sujet n'est pas anodin : en choisissant une API tierce complexe avec un protocole OAuth 2.0 complet, un manifeste de données massif (~300 Mo) et des contraintes techniques inattendues, je me suis volontairement placé dans des conditions proches d'un projet professionnel réel, bien au-delà d'un exercice académique classique.

### Ce que ce projet m'a apporté

Ce projet est entièrement personnel. Il m'a permis de mettre en pratique l'ensemble des compétences acquises durant ma formation, en situation réelle de développement :

- **Conception** d'une architecture REST découplée frontend/backend
- **Authentification** double-couche (JWT applicatif + OAuth 2.0 Bungie)
- **Intégration d'API tierces** avec gestion du cycle de vie des tokens
- **Gestion de bases de données** avec Prisma ORM et SQLite
- **Tests automatisés** (66 tests, backend + frontend)
- **Conteneurisation** Docker et intégration continue GitHub Actions

Ce dossier de projet présente l'ensemble de cette réalisation, de la conception à la mise en place des tests, en passant par les choix techniques et les problèmes rencontrés.

---

## II. Architecture technique

### Vue d'ensemble

Guardian Ledger repose sur une architecture **découplée frontend/backend**, conteneurisée avec Docker et exposée via un reverse proxy Nginx. L'ensemble est déployé sur un VPS Linux accessible à l'adresse **https://guardian-ledger.fr**.

```
Navigateur
    │
    ▼
https://guardian-ledger.fr
    │
    ▼
┌─────────────────────────────┐
│  Nginx (reverse proxy)      │  ← ports 80 / 443
│  - Redirection HTTP → HTTPS │
│  - /api/* → backend:3000    │
│  - /*     → frontend:80     │
└─────────────────────────────┘
         │                │
         ▼                ▼
   ┌──────────┐     ┌──────────┐
   │ Backend  │     │ Frontend │
   │ Node.js  │     │  Nginx   │
   │ Express  │     │  +Vue.js │
   │ +Prisma  │     │ (static) │
   │ +SQLite  │     └──────────┘
   └──────────┘
```

### Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| **Frontend** | Vue.js 3 + Vite | Interface utilisateur SPA |
| **Routeur** | Vue Router | Navigation côté client |
| **Backend** | Node.js + Express | API REST |
| **ORM** | Prisma | Accès base de données |
| **Base de données** | SQLite | Stockage utilisateurs et tokens |
| **Manifeste** | SQLite (~291 Mo) | Données statiques Destiny 2 |
| **Auth applicative** | JWT (jsonwebtoken) | Sessions utilisateurs |
| **Auth Bungie** | OAuth 2.0 | Accès à l'API Bungie.net |
| **Reverse proxy** | Nginx | Routage et HTTPS |
| **SSL** | Let's Encrypt / Certbot | Certificat TLS gratuit |
| **Conteneurisation** | Docker + Docker Compose | Isolation et déploiement |
| **CI/CD** | GitHub Actions | Tests automatisés + déploiement |

### Authentification double-couche

Le projet implémente deux niveaux d'authentification indépendants :

1. **JWT applicatif** — l'utilisateur crée un compte email/mot de passe sur Guardian Ledger. À la connexion, le backend génère un token JWT signé retourné au frontend et stocké en mémoire. Ce token est vérifié par le middleware `requireAuth` sur toutes les routes protégées.

2. **OAuth 2.0 Bungie** — pour accéder aux données Destiny 2, l'utilisateur autorise l'application via le portail Bungie.net. Le backend échange le code d'autorisation contre un `access_token` et un `refresh_token`, stockés en base de données et associés au compte utilisateur.

Cette architecture permet de dissocier l'identité applicative (compte Guardian Ledger) de l'identité Bungie, offrant ainsi une gestion fine des droits et une sécurité renforcée.

---

## III. Modèle de données

### Schéma Prisma

La base de données applicative (SQLite) contient une seule table `User` gérée via Prisma ORM :

```prisma
model User {
  id                    Int       @id @default(autoincrement())
  email                 String    @unique
  password              String
  bungieMembershipId    String?   @unique
  bungieAccessToken     String?
  bungieRefreshToken    String?
  bungieTokenExpiresAt  DateTime?
  displayName           String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

Ce modèle centralise les informations d'authentification applicative (`email`, `password` hashé avec bcrypt) et les tokens OAuth Bungie (`bungieAccessToken`, `bungieRefreshToken`, `bungieTokenExpiresAt`). La gestion de l'expiration du token permet au backend de détecter automatiquement les tokens périmés et de les renouveler via l'endpoint de refresh Bungie.

### Manifeste Destiny 2

En parallèle, l'application utilise une base SQLite secondaire (`manifest.db`, ~291 Mo) contenant les définitions statiques du jeu Destiny 2 téléchargées depuis l'API Bungie. Ce fichier sert de dictionnaire local : à partir d'un hash numérique retourné par l'API (identifiant un objet, une arme, une armure...), le backend interroge le manifeste pour récupérer le nom, la description, l'icône et les statistiques associés.

---

## IV. Intégration de l'API Bungie

### Contraintes spécifiques

L'API Bungie.net présente plusieurs particularités qui ont rendu son intégration particulièrement formatrice :

- **OAuth 2.0 complet** avec code d'autorisation, access token de courte durée et refresh token
- **Manifeste massif** (~300 Mo) à télécharger, décompresser et indexer dans SQLite
- **Hashes 32-bit signés** pour identifier les définitions d'objets, nécessitant une conversion spécifique (`hash >> 0`) pour correspondre aux IDs SQLite
- **Structure d'inventaire complexe** avec buckets (catégories d'emplacements) et instances d'objets

### Flux OAuth

```
Utilisateur                Frontend              Backend              Bungie.net
    │                          │                    │                      │
    │── Clique "Lier Bungie" ──▶│                    │                      │
    │                          │── GET /api/auth/bungie/login ──▶│          │
    │                          │                    │── Génère state JWT    │
    │◀── Redirect vers Bungie ─────────────────────────────────────────────▶│
    │── Autorise l'application ────────────────────────────────────────────▶│
    │◀── Redirect /callback?code=... ──────────────────────────────────────│
    │                          │── GET /api/auth/bungie/callback?code ──▶│  │
    │                          │                    │── Échange code contre tokens
    │                          │                    │── Stocke tokens en BDD
    │                          │◀── Retourne JWT mis à jour ─────────────│  │
```

---

## V. Tests automatisés

### Stratégie de test

Le projet compte **66 tests** répartis entre le backend (Jest) et le frontend (Vitest). L'objectif était de couvrir les comportements critiques de l'application : authentification, gestion des tokens, routes protégées et rendu des composants.

### Tests backend (Jest)

Les tests backend couvrent :

- **`requireAuth.test.js`** — middleware d'authentification JWT : absence de token, token malformé, token valide
- **`routerAuth.test.js`** — routes d'inscription, connexion, callback OAuth Bungie
- **`routerMe.helpers.test.js`** — fonctions utilitaires de gestion des tokens Bungie
- **`bungieService.test.js`** — appels à l'API Bungie avec gestion des headers
- **`manifestService.test.js`** — lecture du manifeste SQLite et conversion des hashes

### Tests frontend (Vitest)

Les tests frontend couvrent :

- **`index.test.js`** — configuration du routeur Vue Router et navigation
- **`HomeView.test.js`** — rendu de la page d'accueil
- **`LoginView.test.js`** — formulaire de connexion, validation, appels API

---

## VI. Pipeline CI/CD

### Intégration continue (CI)

À chaque `push` ou `pull request` sur les branches `main` et `master`, GitHub Actions déclenche automatiquement deux jobs en parallèle :

- **Backend Tests** — installe les dépendances Node.js 22 et exécute les 66 tests Jest
- **Frontend Tests** — installe les dépendances et exécute les tests Vitest

Si l'un des jobs échoue, le merge est bloqué, garantissant qu'aucun code défaillant n'atteint la branche principale.

### Déploiement continu (CD)

Un troisième job `deploy` se déclenche **uniquement après la réussite des deux jobs de tests** et **uniquement sur la branche principale**. Il se connecte au VPS via SSH et exécute :

```bash
cd ~/guardian_ledger
git pull
docker compose up -d --build backend frontend
docker compose restart nginx
```

Les secrets de connexion (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) sont stockés dans les **GitHub Secrets** du repository et ne sont jamais exposés dans le code.

### Schéma du pipeline

```
git push (main)
      │
      ├──────────────────────┐
      ▼                      ▼
Backend Tests          Frontend Tests
  (Jest)                 (Vitest)
      │                      │
      └──────────┬───────────┘
                 ▼
           Les 2 OK ?
                 │
          ┌──────┴──────┐
          │ OUI         │ NON
          ▼             ▼
       Deploy        ❌ Bloqué
    (SSH → VPS)
```