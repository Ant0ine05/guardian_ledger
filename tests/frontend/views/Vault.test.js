import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Vault from '../../../src/frontend/src/views/Vault.vue';

function makeToken(payload) {
    return 'h.' + btoa(JSON.stringify(payload)) + '.s';
}

const FAKE_TOKEN = makeToken({ displayName: 'GuardianX#1234', userId: 1 });

const ITEM_GJALLY = {
    id: 'w1', name: 'Gjallarhorn', power: 1810, rarity: 'exotic',
    icon: '', type: 'Cinétique', bucketHash: 1498876634,
    guardianClass: 'Universel', instanced: true, itemHash: 1274330687,
};
const ITEM_ARBA = {
    id: 'w2', name: 'Arbalète Ancrée', power: 1750, rarity: 'legendary',
    icon: '', type: 'Cinétique', bucketHash: 1498876634,
    guardianClass: 'Universel', instanced: true, itemHash: 9999,
};

const EMPTY_VAULT = {
    kinetic: [], energy: [], power: [],
    helmet: [], gauntlets: [], chest: [], legs: [], classItem: [],
};
const VAULT_WITH_ITEMS = { ...EMPTY_VAULT, kinetic: [ITEM_GJALLY, ITEM_ARBA] };

function makeSuccessResponse(vault = VAULT_WITH_ITEMS) {
    return {
        ok: true, status: 200,
        json: async () => ({
            displayName: 'GuardianX#1234',
            characters: [],
            vault,
            vaultCapacity: 500,
        }),
    };
}

function buildRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/vault', name: 'vault', component: Vault },
            { path: '/login', name: 'login', component: { template: '<div />' } },
        ],
    });
}

describe('Vault', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // ── Redirection ──────────────────────────────────────────────────────────
    it('redirige vers /login si aucun token n\'est stocké', async () => {
        const router = buildRouter();
        await router.push('/vault');
        mount(Vault, { global: { plugins: [router] } });
        await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
    });

    it('redirige vers /login et supprime le token si fetch retourne 401', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
        const router = buildRouter();
        await router.push('/vault');
        mount(Vault, { global: { plugins: [router] } });
        await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
        expect(localStorage.getItem('app_token')).toBeNull();
    });

    // ── Affichage des données ────────────────────────────────────────────────
    it('affiche les items du coffre après chargement réussi', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();
        expect(wrapper.text()).toContain('Gjallarhorn');
        expect(wrapper.text()).toContain('Arbalète Ancrée');
        wrapper.unmount();
    });

    it('affiche le compteur d\'items exotiques correct', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();
        // 1 exotic dans VAULT_WITH_ITEMS (Gjallarhorn)
        expect(wrapper.text()).toContain('1');
        expect(wrapper.text()).toContain('exotiques');
        wrapper.unmount();
    });

    it('affiche la capacité du vault récupérée depuis l\'API', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();
        expect(wrapper.text()).toContain('500');
        wrapper.unmount();
    });

    // ── Filtres et tri ──────────────────────────────────────────────────────
    it('filtre les items par nom lors d\'une recherche textuelle', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();

        const searchInput = wrapper.find('input[type="text"]');
        await searchInput.setValue('Gjallarhorn');
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('Gjallarhorn');
        expect(wrapper.text()).not.toContain('Arbalète Ancrée');
        wrapper.unmount();
    });

    it('trie les items par puissance décroissante par défaut (Gjallarhorn avant Arbalète)', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();

        const html = wrapper.html();
        const pos1 = html.indexOf('Gjallarhorn');
        const pos2 = html.indexOf('Arbalète Ancrée');
        expect(pos1).toBeGreaterThan(-1);
        expect(pos2).toBeGreaterThan(-1);
        expect(pos1).toBeLessThan(pos2);
        wrapper.unmount();
    });

    it('trie par ordre alphabétique après clic sur le bouton A→Z', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();

        // Cliquer sur le bouton de tri A→Z
        // Chercher le bouton par son label exact pour ne pas confondre avec les filtres de classe
        const sortBtns = wrapper.findAll('.filter-tab');
        const azBtn = sortBtns.find(b => b.text().includes('→ Z'));
        if (azBtn) {
            await azBtn.trigger('click');
            await wrapper.vm.$nextTick();
            const html = wrapper.html();
            const posArba = html.indexOf('Arbalète Ancrée');
            const posGjally = html.indexOf('Gjallarhorn');
            expect(posArba).toBeLessThan(posGjally);
        }
        wrapper.unmount();
    });

    // ── Sections du coffre ──────────────────────────────────────────────────
    it('replie la section kinetic au clic sur son en-tête', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();

        // La section kinetic est ouverte par défaut
        const sectionHeaders = wrapper.findAll('.section-header--collapsible');
        expect(sectionHeaders.length).toBeGreaterThan(0);
        await sectionHeaders[0].trigger('click');
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.collapsed.kinetic).toBe(true);
        wrapper.unmount();
    });

    it('déplie une section après un second clic sur son en-tête', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue(makeSuccessResponse());
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] }, attachTo: document.body });
        await flushPromises();

        const headers = wrapper.findAll('.section-header--collapsible');
        await headers[0].trigger('click');
        await headers[0].trigger('click');
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.collapsed.kinetic).toBe(false);
        wrapper.unmount();
    });

    // ── Gestion des erreurs ──────────────────────────────────────────────────
    it('affiche un message d\'erreur réseau si fetch est rejeté', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockRejectedValue(new Error('Network error'));
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('Erreur réseau.');
    });

    it('affiche un message si l\'API retourne une erreur non-401', async () => {
        localStorage.setItem('app_token', FAKE_TOKEN);
        global.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
        const router = buildRouter();
        await router.push('/vault');
        const wrapper = mount(Vault, { global: { plugins: [router] } });
        await flushPromises();
        expect(wrapper.text()).toContain('Impossible de charger les données Bungie.');
    });
});
