// On teste la logique du guard de navigation en isolation,
// sans importer le router (qui utilise createWebHistory, non compatible jsdom).
import { describe, it, expect } from 'vitest';

/**
 * Réplique fidèle du guard défini dans src/frontend/src/router/index.js
 * Le paramètre `getToken` permet d'injecter le token pour les tests.
 */
function navigationGuard(to, getToken) {
    if (to.meta?.requiresAuth && !getToken()) {
        return { name: 'login' };
    }
    if (to.name === 'login' && getToken()) {
        return { name: 'dashboard' };
    }
    return undefined;
}

describe('Navigation guard - routes protégées (requiresAuth)', () => {
    it('redirige vers /login si non authentifié et la route nécessite auth', () => {
        const result = navigationGuard(
            { name: 'dashboard', meta: { requiresAuth: true } },
            () => null
        );
        expect(result).toEqual({ name: 'login' });
    });

    it('laisse passer si authentifié et la route nécessite auth', () => {
        const result = navigationGuard(
            { name: 'dashboard', meta: { requiresAuth: true } },
            () => 'valid-app-token'
        );
        expect(result).toBeUndefined();
    });

    it('laisse passer les routes publiques sans token', () => {
        const result = navigationGuard(
            { name: 'home', meta: {} },
            () => null
        );
        expect(result).toBeUndefined();
    });

    it('vault requiert auth : redirige si non connecté', () => {
        const result = navigationGuard(
            { name: 'vault', meta: { requiresAuth: true } },
            () => null
        );
        expect(result).toEqual({ name: 'login' });
    });
});

describe('Navigation guard - redirection depuis /login', () => {
    it('redirige vers /dashboard si déjà connecté et tente d\'accéder à /login', () => {
        const result = navigationGuard(
            { name: 'login', meta: {} },
            () => 'valid-app-token'
        );
        expect(result).toEqual({ name: 'dashboard' });
    });

    it('laisse accéder à /login si non connecté', () => {
        const result = navigationGuard(
            { name: 'login', meta: {} },
            () => null
        );
        expect(result).toBeUndefined();
    });
});
