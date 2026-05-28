# Documentation des Tests — Guardian Ledger

> Dernière mise à jour : 28 mai 2026  
> **113 tests au total** — 55 backend (Jest) + 58 frontend (Vitest)  
> Tous les tests sont verts localement et sur la pipeline CI/CD GitHub Actions.
>
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
| Backend — Route | `routerAuth.test.js` | 20 |
| Backend — Route | `routerData.test.js` | 2 |
| Backend — Helpers | `routerMe.helpers.test.js` | 20 |
| Frontend — Router | `index.test.js` | 6 |
| Frontend — Vue | `LoginView.test.js` | 11 |
| Frontend — Vue | `HomeView.test.js` | 7 |
| Frontend — Vue | `Dashboard.test.js` | 8 |
| Frontend — Vue | `Vault.test.js` | 12 |
| Frontend — Composant | `ItemDetailModal.test.js` | 14 |
| **Total** | | **114** |

---

## Backend

### 1. Middleware — `requireAuth`

**Fichier :** `tests/backend/middleware/requireAuth.test.js`  
**Module testé :** `src/backend/middleware/requireAuth.js`  
**Mocks :** `jsonwebtoken`

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
**Mocks :** `better-sqlite3`, `dotenv` — avec `jest.resetModules()` / `jest.doMock()` par test

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

#### POST `/api/auth/register`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Corps vide (email + mot de passe absents) | `400` · `{ error: 'Email et mot de passe requis.' }` |
| 2 | Email fourni mais mot de passe absent | `400` |
| 3 | Format email invalide | `400` · `{ error: 'Email invalide.' }` |
| 4 | Mot de passe inférieur à 8 caractères | `400` · `{ error: 'Mot de passe trop court (min 8 caractères).' }` |
| 5 | Email déjà utilisé en base | `409` · `{ error: 'Cet email est déjà utilisé.' }` |
| 6 | Données valides, utilisateur inexistant | `200` · `{ tempToken: 'mock-jwt-token' }` · `prisma.user.create` appelé 1× |
| 7 | Erreur DB lors de la création (prisma.user.create rejeté) | `500` · `{ error: 'Erreur serveur.' }` |

#### POST `/api/auth/login`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 8 | Email ou mot de passe absent | `400` · `{ error: 'Email et mot de passe requis.' }` |
| 9 | Utilisateur introuvable en base | `401` · `{ error: 'Identifiants incorrects.' }` |
| 10 | Mot de passe incorrect (`bcrypt.compare` → `false`) | `401` |
| 11 | Connexion valide mais compte Bungie non lié | `200` · `{ bungieRequired: true, tempToken }` |
| 12 | Connexion complète (Bungie lié) | `200` · `{ appToken, displayName }` |
| 13 | Erreur DB lors de la recherche (prisma.user.findUnique rejeté) | `500` · `{ error: 'Erreur serveur.' }` |

#### GET `/api/auth/bungie-connect`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 14 | Paramètre `state` absent | `400` · `{ error: 'State manquant.' }` |
| 15 | `state` présent | `302` vers `www.bungie.net/en/OAuth/Authorize` |

#### GET `/api/auth/callback`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 16 | State JWT invalide ou expiré | `400` contenant `'Session expirée'` |
| 17 | Flux OAuth complet (jwt valid, axios ok, user trouvé) | `302` vers `/dashboard?appToken=final-app-token` |
| 18 | Utilisateur introuvable après OAuth | `404` contenant `'introuvable'` |
| 19 | `axios.post` (échange token) rejeté | `500` · `"Erreur lors de l'authentification Bungie."` |

---

### 5. Routes — `routerData`

**Fichier :** `tests/backend/routes/routerData.test.js`  
**Module testé :** `src/backend/routes/routerData.js`  
**Mocks :** `manifestService.getDefinition`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Hash valide trouvé dans le manifest | `200` · `{ name: 'Gjallarhorn', icon: 'https://www.bungie.net/...', type: 'Arme de puissance' }` |
| 2 | Hash inconnu du manifest | `404` · `{ error: 'Item introuvable' }` |

---

### 6. Helpers — `routerMe`

**Fichier :** `tests/backend/routes/routerMe.helpers.test.js`  
**Module testé :** `src/backend/routes/routerMe.js` (export `_helpers`)  
**Mocks :** `db`, `middleware/requireAuth`, `services/manifestService`, `axios`

#### `dedupe(items)`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Tableau vide | `[]` |
| 2 | Tous les ids uniques | Tableau inchangé |
| 3 | Un doublon présent | 2 éléments · première occurrence conservée |
| 4 | Plusieurs doublons du même id | Un seul élément conservé |
| 5 | Non-mutation | Tableau d'entrée inchangé |

#### Constantes de mapping

| # | Constante | Description | Résultat attendu |
|---|-----------|-------------|-----------------|
| 6 | `TIER_MAP` | Raretés Destiny 2 | `6`→`exotic`, `5`→`legendary`, `4`→`rare`, `3`→`uncommon`, `2`→`common` |
| 7 | `CLASS_MAP` | Classes de gardien | `0`→`Titan`, `1`→`Chasseur`, `2`→`Arcaniste` |
| 8 | `RACE_MAP` | Races | `0`→`Humain`, `1`→`Éveillé`, `2`→`Exo` |
| 9 | `BUCKET_LABEL` (armes) | Labels emplacements armes | Cinétique, Énergie, Puissance |
| 10 | `BUCKET_LABEL` (armures) | Labels emplacements armures | Casque, Gantelets, Torse, Jambes, Classe |

#### `buildItem(itemHash, itemInstanceId, instances, index)`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 11 | `getDefinition` retourne `null` | `null` |
| 12 | Item instancié avec toutes les données | `{ id, name, rarity: 'exotic', power: 1810, icon: 'https://...', type, instanced: true }` |
| 13 | `instanceId` absent (`null`) | `id = '${itemHash}_${index}'` · `instanced: false` |
| 14 | Instance sans `primaryStat` | `power: 0` |
| 15 | Définition avec `icon` | `icon` préfixée `'https://www.bungie.net'` |
| 16 | Définition sans `icon` | `icon: ''` |
| 17 | `classType: 255` | `guardianClass: 'Universel'` |
| 18 | `classType: 1` | `guardianClass: 'Chasseur'` |
| 19 | `displayProperties.name` absent | `name: 'Inconnu'` |
| 20 | `tierType` non reconnu | `rarity: 'common'` |

---

## Frontend

### 7. Router — Navigation Guard

**Fichier :** `tests/frontend/router/index.test.js`  
**Outil :** Vitest — logique de guard testée en isolation

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Non auth · route `dashboard` (`requiresAuth`) | Redirige vers `{ name: 'login' }` |
| 2 | Auth · route `dashboard` (`requiresAuth`) | Laisse passer (`undefined`) |
| 3 | Non auth · route publique | Laisse passer |
| 4 | Non auth · route `vault` (`requiresAuth`) | Redirige vers `{ name: 'login' }` |
| 5 | Déjà connecté · accède à `/login` | Redirige vers `{ name: 'dashboard' }` |
| 6 | Non connecté · accède à `/login` | Laisse passer |

---

### 8. Vue — `LoginView`

**Fichier :** `tests/frontend/views/LoginView.test.js`  
**Mocks :** `global.fetch` (vi.fn)

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Rendu initial | Onglet "Connexion" actif, champs email + password visibles |
| 2 | Clic sur l'onglet "Créer un compte" | Onglet bascule, bouton passe à "Créer mon compte" |
| 3 | Erreur affichée puis changement d'onglet | Message d'erreur effacé |
| 4 | Mots de passe de confirmation différents | `'Les mots de passe ne correspondent pas.'` |
| 5 | Réponse serveur `ok: false` au login | `'Identifiants incorrects.'` |
| 6 | `fetch` rejeté (réseau coupé) | `'Impossible de contacter le serveur.'` |
| 7 | Réponse invalide (mauvais format) | Message d'erreur affiché |
| 8 | Login réussi (`appToken` reçu) | `localStorage.app_token` peuplé + navigation `/dashboard` |
| 9 | Login avec `bungieRequired: true` | Onglet `bungie-redirect` affiché (`'Connexion à Bungie.net...'`) |
| 10 | Inscription réussie | Onglet `bungie-redirect` affiché |
| 11 | Inscription échouée (erreur serveur) | Message `'Email déjà utilisé.'` visible |

---

### 9. Vue — `HomeView`

**Fichier :** `tests/frontend/views/HomeView.test.js`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Rendu initial | Contient `'Bienvenue sur Guardian Ledger'` |
| 2 | Bouton d'identification présent | Bouton `"S'identifier avec Bungie"` visible |
| 3 | `localStorage` vide | Bloc succès absent |
| 4 | `localStorage` avec `bungie_membership_id` | ID membership affiché |
| 5 | `localStorage` avec `bungie_token` | `'Authentification Bungie réussie'` visible |
| 6 | Paramètres `?token=&membershipId=` dans l'URL | `localStorage.bungie_token` + `bungie_membership_id` peuplés, membershipId visible |
| 7 | Clic sur le bouton d'identification | `window.location.href = 'http://localhost:3000/api/auth/login'` |

---

### 10. Vue — `Dashboard`

**Fichier :** `tests/frontend/views/Dashboard.test.js`  
**Mocks :** `global.fetch` (vi.fn)  
**Helper :** `makeToken(payload)` → JWT factice `h.btoa(JSON.stringify(payload)).s`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Aucun token en localStorage | Redirection vers `/login` |
| 2 | `appToken` dans les query params URL | Token stocké dans `localStorage.app_token` |
| 3 | Token valide en localStorage | `displayName` extrait du JWT visible |
| 4 | Fetch réussi avec 2 gardiens | Cartes `Titan` et `Chasseur` avec puissance affichées |
| 5 | `maxPower` correct | Valeur `1823` visible dans les stats |
| 6 | Fetch retourne 401 | Token supprimé + redirection `/login` |
| 7 | Fetch retourne erreur non-401 | `'Impossible de charger les données Bungie.'` visible |
| 8 | Fetch rejeté (réseau) | `'Erreur réseau.'` visible |

---

### 11. Vue — `Vault`

**Fichier :** `tests/frontend/views/Vault.test.js`  
**Mocks :** `global.fetch` (vi.fn)

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Aucun token en localStorage | Redirection vers `/login` |
| 2 | Fetch retourne 401 | Token supprimé + redirection `/login` |
| 3 | Fetch réussi | `'Gjallarhorn'` et `'Arbalète Ancrée'` visibles |
| 4 | Compteur d'exotiques | `'1'` et `'exotiques'` visibles |
| 5 | Capacité du vault | `'500'` visible (vaultCapacity API) |
| 6 | Recherche textuelle `'Gjallarhorn'` | `'Gjallarhorn'` affiché, `'Arbalète Ancrée'` masqué |
| 7 | Tri puissance décroissante (défaut) | Gjallarhorn (1810) avant Arbalète (1750) dans le HTML |
| 8 | Tri A → Z | Arbalète avant Gjallarhorn dans le HTML |
| 9 | Clic en-tête section kinetic | `wrapper.vm.collapsed.kinetic === true` |
| 10 | Second clic en-tête kinetic (dépliage) | `wrapper.vm.collapsed.kinetic === false` |
| 11 | Fetch rejeté (réseau) | `'Erreur réseau.'` visible |
| 12 | Fetch erreur non-401 | `'Impossible de charger les données Bungie.'` visible |

---

### 12. Composant — `ItemDetailModal`

**Fichier :** `tests/frontend/component/ItemDetailModal.test.js`  
**Stub :** `Teleport` → `<div class="teleport-stub"><slot /></div>`

| # | Description | Résultat attendu |
|---|-------------|-----------------|
| 1 | Affiche le nom et la puissance | `'Gjallarhorn'` et `'1810'` dans le texte |
| 2 | Affiche le type et le flavorText | `'Cinétique'` et `'Ça mord.'` |
| 3 | `loading=true` | `.idm-loading` présent dans le DOM |
| 4 | Statistiques avec valeurs | `'Impact'`, `'95'`, `'Portée'`, `'48'` |
| 5 | Perks / sockets affichés | `'Propergol de Wolf'` visible |
| 6 | Armure 75 pts → tier S | `'75'` et `'S'` visibles |
| 7 | Item non instancié (`detail=null`) | `'Pas de statistiques disponibles'` visible |
| 8 | Barre de transfert absente si non instancié | `.idm-transfer-bar` absent |
| 9 | Barre de transfert absente sans personnages | `.idm-transfer-bar` absent |
| 10 | Barre de transfert présente si instancié + personnages | `.idm-transfer-bar` présent |
| 11 | Clic bouton fermeture (`.idm-close`) | Événement `'close'` émis |
| 12 | Clic overlay (`.idm-overlay`) | Événement `'close'` émis |
| 13 | Transfert vers personnage | `'transfer'` émis avec `{ instanceId, itemHash, transferToVault: false, characterId }` |
| 14 | Transfert vers coffre | `'transfer'` émis avec `{ transferToVault: true, instanceId }` |

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
    │   │   ├── routerData.test.js        (Jest + Supertest)
    │   │   └── routerMe.helpers.test.js  (Jest)
    │   └── services/
    │       ├── bungieService.test.js     (Jest)
    │       └── manifestService.test.js   (Jest)
    └── frontend/
        ├── component/
        │   └── ItemDetailModal.test.js   (Vitest + vue/test-utils)
        ├── router/
        │   └── index.test.js             (Vitest)
        └── views/
            ├── Dashboard.test.js         (Vitest + vue/test-utils)
            ├── HomeView.test.js          (Vitest + vue/test-utils)
            ├── LoginView.test.js         (Vitest + vue/test-utils)
            └── Vault.test.js             (Vitest + vue/test-utils)
```

## Lancer les tests

```bash
# Backend (depuis src/backend/)
npm test               # Exécution unique

# Frontend (depuis src/frontend/)
npm test               # Exécution unique
```

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) exécute les tests backend et frontend **en parallèle** sur `ubuntu-latest` / Node 22 à chaque `push` ou `pull_request` sur `main`. Le déploiement SSH vers le VPS ne se déclenche qu'après la réussite des deux suites de tests.
