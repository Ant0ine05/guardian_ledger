import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Dashboard from '../../../src/frontend/src/views/Dashboard.vue';

// Crée un faux JWT lisible par parseJwt (base64 du payload)
function makeToken(payload) {
    return 'h.' + btoa(JSON.stringify(payload)) + '.s';
}

const FAKE_TOKEN = makeToken({ displayName: 'GuardianX#1234', email: 'x@test.com', userId: 1 });

const DEFAULT_RESPONSE = {
    displayName: 'GuardianX#1234',
    characters: [],
    vault: { kinetic: [], energy: [], power: [], helmet: [], gauntlets: [], chest: [], legs: [], classItem: [] },
    vaultCapacity: 500,
};

function buildRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/dashboard', name: 'dashboard', component: Dashboard },
            { path: '/login',     name: 'login',     component: { template: '<div />' } },
        ],
    });
}

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // ── Authentification / redirection ──────────────────────────────────────
    it('redirige vers /login si aucun token n\'est stocké en localStorage', async () => {
        const router = buildRouter();
        await router.push('/dashboard');
        mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
    });

    it('stocke le token et charge les données si appToken est dans les paramètres d\'URL', async () => {
        global.fetch.mockResolvedValue({
            ok: true, status: 200,
            json: async () => DEFAULT_RESPONSE,
        });
        const router = buildRouter();
        await router.push(`/dashboard?appToken=${FAKE_TOKEN}`);
        mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(localStorage.getItem('app_token')).toBe(FAKE_TOKEN);
    });

    // ── Affichage des données ────────────────────────────────────────────────
    it('affiche le displayName extrait du JWT stocké', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({
            ok: true, status: 200,
            json: async () => DEFAULT_RESPONSE,
        });
        const router = buildRouter();
        await router.push('/dashboard');
        const wrapper = mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('GuardianX');
    });

    it('affiche les cartes gardiens et leurs puissances après chargement réussi', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({
            ok: true, status: 200,
            json: async () => ({
                ...DEFAULT_RESPONSE,
                characters: [
                    {
                        id: 'char1', class: 'Titan', race: 'Humain', subclass: 'Arc', power: 1810,
                        emblemPath: '', emblemBackgroundPath: '',
                        weapons: { kinetic: null, energy: null, power: null },
                        armor:   { helmet: null, chest: null, gauntlets: null, legs: null, classItem: null },
                        inventory: [],
                    },
                    {
                        id: 'char2', class: 'Chasseur', race: 'Exo', subclass: '', power: 1800,
                        emblemPath: '', emblemBackgroundPath: '',
                        weapons: { kinetic: null, energy: null, power: null },
                        armor:   { helmet: null, chest: null, gauntlets: null, legs: null, classItem: null },
                        inventory: [],
                    },
                ],
            }),
        });
        const router = buildRouter();
        await router.push('/dashboard');
        const wrapper = mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('Titan');
        expect(wrapper.text()).toContain('Chasseur');
        expect(wrapper.text()).toContain('1810');
    });

    it('affiche maxPower comme le maximum de puissance parmi les gardiens', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({
            ok: true, status: 200,
            json: async () => ({
                ...DEFAULT_RESPONSE,
                characters: [
                    { id: 'c1', class: 'Titan', race: 'Humain', subclass: '', power: 1800, emblemPath: '', emblemBackgroundPath: '', weapons: { kinetic: null, energy: null, power: null }, armor: { helmet: null, chest: null, gauntlets: null, legs: null, classItem: null }, inventory: [] },
                    { id: 'c2', class: 'Arcaniste', race: 'Éveillé', subclass: '', power: 1823, emblemPath: '', emblemBackgroundPath: '', weapons: { kinetic: null, energy: null, power: null }, armor: { helmet: null, chest: null, gauntlets: null, legs: null, classItem: null }, inventory: [] },
                ],
            }),
        });
        const router = buildRouter();
        await router.push('/dashboard');
        const wrapper = mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        // maxPower = 1823 doit apparaître dans les stats
        expect(wrapper.text()).toContain('1823');
    });

    // ── Gestion des erreurs ──────────────────────────────────────────────────
    it('redirige vers /login et supprime le token si fetch retourne 401', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({
            ok: false, status: 401,
            json: async () => ({ error: 'Non autorisé.' }),
        });
        const router = buildRouter();
        await router.push('/dashboard');
        mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(localStorage.getItem('app_token')).toBeNull();
        expect(router.currentRoute.value.path).toBe('/login');
    });

    it('affiche une erreur Bungie si fetch retourne une erreur non-401', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({
            ok: false, status: 503,
            json: async () => ({}),
        });
        const router = buildRouter();
        await router.push('/dashboard');
        const wrapper = mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('Impossible de charger les données Bungie.');
    });

    it('affiche une erreur réseau si fetch est rejeté', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockRejectedValue(new Error('Network error'));
        const router = buildRouter();
        await router.push('/dashboard');
        const wrapper = mount(Dashboard, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('Erreur réseau.');
    });
});
