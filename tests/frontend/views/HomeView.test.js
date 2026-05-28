import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import HomeView from '../../../src/frontend/src/views/HomeView.vue';

function buildRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', name: 'home', component: HomeView }],
    });
}

describe('HomeView', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('affiche le titre de bienvenue', () => {
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        expect(wrapper.text()).toContain('Bienvenue sur Guardian Ledger');
    });

    it('affiche le bouton de connexion Bungie', () => {
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        expect(wrapper.find('button').text()).toContain("S'identifier avec Bungie");
    });

    it('n\'affiche pas le bloc de connexion si localStorage est vide', () => {
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        expect(wrapper.text()).not.toContain('Authentification Bungie réussie');
    });

    it('affiche le membership ID récupéré depuis localStorage', async () => {
        localStorage.setItem('bungie_token', 'fake-access-token');
        localStorage.setItem('bungie_membership_id', '4611686018467765321');
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('4611686018467765321');
    });

    it('affiche le message de succès si le token Bungie est présent', async () => {
        localStorage.setItem('bungie_token', 'fake-access-token');
        localStorage.setItem('bungie_membership_id', '123456');
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('Authentification Bungie réussie');
    });

    it('stocke les données en localStorage si des paramètres d\'URL token et membershipId sont présents', async () => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/', name: 'home', component: HomeView }],
        });
        await router.push('/?token=urltoken99&membershipId=987654321');
        const wrapper = mount(HomeView, { global: { plugins: [router] } });
        await wrapper.vm.$nextTick();
        expect(localStorage.getItem('bungie_token')).toBe('urltoken99');
        expect(localStorage.getItem('bungie_membership_id')).toBe('987654321');
        expect(wrapper.text()).toContain('987654321');
    });

    it('déclenche la navigation Bungie au clic sur le bouton d\'identification', async () => {
        vi.stubGlobal('location', { href: '' });
        const wrapper = mount(HomeView, { global: { plugins: [buildRouter()] } });
        await wrapper.find('button').trigger('click');
        expect(window.location.href).toBe('http://localhost:3000/api/auth/login');
        vi.unstubAllGlobals();
    });
});
