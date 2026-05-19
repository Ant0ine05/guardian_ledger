import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
