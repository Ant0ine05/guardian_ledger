# Documentation des Tests — Guardian Ledger

> **Stack de test**
> - Backend : [Jest 29](https://jestjs.io/) + [Supertest 7](https://github.com/ladjs/supertest)
> - Frontend : [Vitest 3](https://vitest.dev/) + [@vue/test-utils 2](https://test-utils.vuejs.org/)
> - CI/CD : GitHub Actions (`.github/workflows/ci.yml`), déclenché sur `push` / `pull_request` vers `main`

---

## Récapitulatif général

| Périmètre | Fichier de test | Tests |
|-----------|----------------|------:|
| Backend — Middleware | `requireAuth.test.js` | 4 |
| Backend — Service | `bungieService.test.js` | 5 |
| Backend — Service | `manifestService.test.js` | 5 |
| Backend — Route | `routerAuth.test.js` | 14 |
| Backend — Helpers | `routerMe.helpers.test.js` | 20 |
| Frontend — Router | `index.test.js` | 6 |
| Frontend — Vue | `LoginView.test.js` | 7 |
| Frontend — Vue | `HomeView.test.js` | 5 |
| **Total** | | **66** |

---

## Backend

### 1. Middleware — `requireAuth`

**Fichier :** `tests/backend/middleware/requireAuth.test.js`  
**Module testé :** `src/backend/middleware/requireAuth.js`  
**Mocks :** `jsonwebtoken`

Ce middleware protège les routes privées en vérifiant la présence et la validité d'un token JWT dans le header `Authorization`.

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Header `Authorization` absent | `401` · `{ error: 'Non autorisé.' }` · `next()` non appelé |
| 2 | Header présent mais ne commence pas par `Bearer ` | `401` · `next()` non appelé |
| 3 | Token JWT invalide ou expiré | `401` · `{ error: 'Token invalide ou expiré.' }` · `next()` non appelé |
| 4 | Token JWT valide | `next()` appelé · `req.user` peuplé avec le payload décodé |

---

### 2. Service — `bungieService`

**Fichier :** `tests/backend/services/bungieService.test.js`  
**Module testé :** `src/backend/services/bungieService.js`  
**Mocks :** `axios`

Ce service est le point d'entrée unique pour appeler l'API Bungie. Il construit l'URL complète et gère les headers d'authentification.

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Appel sans token | URL correcte `https://www.bungie.net/Platform/...` avec header `X-API-Key` |
| 2 | Appel avec `accessToken` | Header `Authorization: Bearer <token>` présent |
| 3 | Appel sans `accessToken` | Header `Authorization` absent |
| 4 | Réponse de l'API | Retourne directement la propriété `Response` de la réponse Bungie |
| 5 | Erreur réseau | L'erreur est propagée (`rejects.toThrow`) |

---

### 3. Service — `manifestService`

**Fichier :** `tests/backend/services/manifestService.test.js`  
**Module testé :** `src/backend/services/manifestService.js`  
**Mocks :** `better-sqlite3`, `dotenv` — avec `jest.resetModules()` / `jest.doMock()` par test (la DB est instanciée au niveau du module)

Ce service interroge la base de données SQLite locale du manifest Destiny 2 pour récupérer les définitions d'items.

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Ligne trouvée en base | Retourne l'objet JSON parsé |
| 2 | Ligne introuvable | Retourne `null` |
| 3 | Erreur SQL (table inexistante) | Retourne `null` sans lever d'exception |
| 4 | Hash en entier 32-bit signé | `0xFFFFFF00` → requête SQL avec `-256` |
| 5 | Nom de table dynamique | `prepare()` appelé avec `SELECT json FROM <tableName> WHERE id = ?` |

---

### 4. Routes — `routerAuth`

**Fichier :** `tests/backend/routes/routerAuth.test.js`  
**Module testé :** `src/backend/routes/routerAuth.js`  
**Mocks :** `db` (Prisma), `bcryptjs`, `jsonwebtoken`, `axios`  
**Setup :** Application Express minimale (`supertest`)

#### POST `/api/auth/register`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Corps vide (email + mot de passe absents) | `400` · `{ error: 'Email et mot de passe requis.' }` |
| 2 | Email fourni mais mot de passe absent | `400` · `{ error: 'Email et mot de passe requis.' }` |
| 3 | Format email invalide | `400` · `{ error: 'Email invalide.' }` |
| 4 | Mot de passe inférieur à 8 caractères | `400` · `{ error: 'Mot de passe trop court (min 8 caractères).' }` |
| 5 | Email déjà utilisé en base | `409` · `{ error: 'Cet email est déjà utilisé.' }` |
| 6 | Données valides, utilisateur inexistant | `200` · `{ tempToken: 'mock-jwt-token' }` · `prisma.user.create` appelé 1× |

#### POST `/api/auth/login`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Email ou mot de passe absent | `400` · `{ error: 'Email et mot de passe requis.' }` |
| 2 | Utilisateur introuvable en base | `401` · `{ error: 'Identifiants incorrects.' }` |
| 3 | Mot de passe incorrect (`bcrypt.compare` → `false`) | `401` · `{ error: 'Identifiants incorrects.' }` |
| 4 | Connexion valide mais compte Bungie non lié | `200` · `{ bungieRequired: true, tempToken: '...' }` |
| 5 | Connexion complète (Bungie lié) | `200` · `{ appToken: '...', displayName: 'GuardianXX#1234' }` |

#### GET `/api/auth/bungie-connect`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Paramètre `state` absent | `400` · `{ error: 'State manquant.' }` |
| 2 | `state` présent | `302` vers `www.bungie.net/en/OAuth/Authorize` avec `client_id` et `state` encodé |

#### GET `/api/auth/callback`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | `state` JWT invalide ou expiré | `400` · réponse contenant `'Session expirée'` |

---

### 5. Helpers — `routerMe`

**Fichier :** `tests/backend/routes/routerMe.helpers.test.js`  
**Module testé :** `src/backend/routes/routerMe.js` (export `_helpers`)  
**Mocks :** `db` (Prisma), `middleware/requireAuth`, `services/manifestService`, `axios`

Les fonctions `buildItem` et `dedupe`, ainsi que les constantes de mapping, sont exportées sous `module.exports._helpers` pour permettre les tests unitaires sans démarrer de serveur HTTP.

#### `dedupe(items)`

Filtre un tableau d'items en supprimant les doublons par `id`, en conservant la première occurrence.

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Tableau vide | `[]` |
| 2 | Tous les ids sont uniques | Tableau inchangé |
| 3 | Un doublon présent | 2 éléments · première occurrence conservée |
| 4 | Plusieurs doublons du même id | Un seul élément conservé par id |
| 5 | Non-mutation | Le tableau d'entrée n'est pas modifié |

#### Constantes de mapping

| # | Constante | Description | Résultat attendu |
|---|-----------|-------------|-----------------|
| 6 | `TIER_MAP` | Raretés Destiny 2 | `6`→`exotic`, `5`→`legendary`, `4`→`rare`, `3`→`uncommon`, `2`→`common` |
| 7 | `CLASS_MAP` | Classes de gardien | `0`→`Titan`, `1`→`Chasseur`, `2`→`Arcaniste` |
| 8 | `RACE_MAP` | Races | `0`→`Humain`, `1`→`Éveillé`, `2`→`Exo` |
| 9 | `BUCKET_LABEL` (armes) | Labels des emplacements armes | Cinétique, Énergie, Puissance |
| 10 | `BUCKET_LABEL` (armures) | Labels des emplacements armures | Casque, Gantelets, Torse, Jambes, Classe |

#### `buildItem(itemHash, itemInstanceId, instances, index)`

Construit un objet item normalisé à partir d'un hash et d'un instanceId en consultant le manifest.

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | `getDefinition` retourne `null` | `null` |
| 2 | Item instancié avec toutes les données | Objet avec `id`, `name`, `rarity: 'exotic'`, `power: 1810`, `icon` préfixée, `type`, `instanced: true` |
| 3 | `instanceId` absent (`null`) | `id` = `'${itemHash}_${index}'` · `instanced: false` |
| 4 | Instance sans `primaryStat` | `power: 0` |
| 5 | Définition avec `icon` | `icon` = `'https://www.bungie.net' + chemin` |
| 6 | Définition sans `icon` | `icon: ''` |
| 7 | `classType` hors `0/1/2` (ex: `255`) | `guardianClass: 'Universel'` |
| 8 | `classType: 1` | `guardianClass: 'Chasseur'` |
| 9 | `displayProperties.name` absent | `name: 'Inconnu'` |
| 10 | `tierType` non reconnu | `rarity: 'common'` (valeur par défaut) |

---

## Frontend

### 6. Router — Navigation Guard

**Fichier :** `tests/frontend/router/index.test.js`  
**Outil :** Vitest (pure function, sans import du router réel)

La logique du guard est testée en isolation via une fonction réplique `navigationGuard(to, getToken)` pour éviter la dépendance à `createWebHistory` (non compatible jsdom).

#### Routes protégées (`requiresAuth: true`)

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Non authentifié · route `dashboard` avec `requiresAuth` | Redirige vers `{ name: 'login' }` |
| 2 | Authentifié · route `dashboard` avec `requiresAuth` | Laisse passer (`undefined`) |
| 3 | Non authentifié · route publique sans `requiresAuth` | Laisse passer (`undefined`) |
| 4 | Non authentifié · route `vault` avec `requiresAuth` | Redirige vers `{ name: 'login' }` |

#### Redirection depuis `/login`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 5 | Déjà connecté · accède à `/login` | Redirige vers `{ name: 'dashboard' }` |
| 6 | Non connecté · accède à `/login` | Laisse passer (`undefined`) |

---

### 7. Vue — `LoginView`

**Fichier :** `tests/frontend/views/LoginView.test.js`  
**Outil :** Vitest + `@vue/test-utils` · `mount` + `flushPromises`  
**Mocks :** `global.fetch` (vi.fn)  
**Setup :** Router en mémoire (`createMemoryHistory`)

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Rendu initial | Onglet "Connexion" actif par défaut |
| 2 | Formulaire de connexion | Champ email + bouton "Se connecter" visibles |
| 3 | Clic sur l'onglet "Créer un compte" | Onglet bascule · bouton passe à "Créer mon compte" |
| 4 | Erreur affichée puis changement d'onglet | Message d'erreur effacé au changement d'onglet |
| 5 | Mots de passe de confirmation différents | Affiche `'Les mots de passe ne correspondent pas.'` |
| 6 | Réponse serveur `ok: false` au login | Affiche `'Identifiants incorrects.'` |
| 7 | `fetch` rejeté (réseau coupé) | Affiche `'Impossible de contacter le serveur.'` |

---

### 8. Vue — `HomeView`

**Fichier :** `tests/frontend/views/HomeView.test.js`  
**Outil :** Vitest + `@vue/test-utils` · `mount`  
**Setup :** `localStorage` réinitialisé avant/après chaque test

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Rendu initial | Contient le texte `'Bienvenue sur Guardian Ledger'` |
| 2 | Bouton d'identification | Bouton avec `"S'identifier avec Bungie"` présent |
| 3 | `localStorage` vide | Bloc de succès `'Authentification Bungie réussie'` absent |
| 4 | `localStorage` avec `bungie_membership_id` | L'ID membership est affiché dans le composant |
| 5 | `localStorage` avec `bungie_token` | Affiche `'Authentification Bungie réussie'` |

---

## Structure des fichiers de tests

```
guardian_ledger/
└── tests/
    ├── backend/
    │   ├── middleware/
    │   │   └── requireAuth.test.js       (Jest)
    │   ├── routes/
    │   │   ├── routerAuth.test.js        (Jest + Supertest)
    │   │   └── routerMe.helpers.test.js  (Jest)
    │   └── services/
    │       ├── bungieService.test.js     (Jest)
    │       └── manifestService.test.js   (Jest)
    └── frontend/
        ├── router/
        │   └── index.test.js             (Vitest)
        └── views/
            ├── HomeView.test.js          (Vitest + vue/test-utils)
            └── LoginView.test.js         (Vitest + vue/test-utils)
```

## Lancer les tests

```bash
# Backend (depuis src/backend/)
npm test               # Exécution unique
npm run test:watch     # Mode watch (TDD)

# Frontend (depuis src/frontend/)
npm test               # Exécution unique
npm run test:watch     # Mode watch (TDD)
```

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) exécute les tests backend et frontend **en parallèle** sur `ubuntu-latest` / Node 22 à chaque `push` ou `pull_request` sur `main`.


