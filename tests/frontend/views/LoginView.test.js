import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import LoginView from '../../../src/frontend/src/views/LoginView.vue';

// Mock global fetch
global.fetch = vi.fn();

function buildRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/login', name: 'login', component: LoginView },
            { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
        ],
    });
}

describe('LoginView', () => {
    let router;

    beforeEach(async () => {
        vi.clearAllMocks();
        router = buildRouter();
        await router.push('/login');
    });

    it('affiche l\'onglet "Connexion" actif par défaut', () => {
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        expect(wrapper.find('.tab-btn.active').text()).toBe('Connexion');
    });

    it('affiche le formulaire de connexion par défaut', () => {
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        expect(wrapper.find('input[type="email"]').exists()).toBe(true);
        expect(wrapper.find('button[type="submit"]').text()).toContain('Se connecter');
    });

    it('bascule sur l\'onglet "Créer un compte" au clic', async () => {
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        const tabs = wrapper.findAll('.tab-btn');
        await tabs[1].trigger('click');
        expect(wrapper.find('.tab-btn.active').text()).toBe('Créer un compte');
        expect(wrapper.find('button[type="submit"]').text()).toContain('Créer mon compte');
    });

    it('efface le message d\'erreur lors d\'un changement d\'onglet', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Identifiants incorrects.' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.find('input[type="email"]').setValue('t@t.com');
        await wrapper.find('input[type="password"]').setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.find('.error-msg').exists()).toBe(true);

        // Changer d'onglet efface l'erreur
        await wrapper.findAll('.tab-btn')[1].trigger('click');
        expect(wrapper.find('.error-msg').exists()).toBe(false);
    });

    it('affiche une erreur si les mots de passe de confirmation ne correspondent pas', async () => {
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.findAll('.tab-btn')[1].trigger('click');
        const passwordInputs = wrapper.findAll('[autocomplete="new-password"]');
        await passwordInputs[0].setValue('password123');
        await passwordInputs[1].setValue('different999');
        await wrapper.find('form').trigger('submit');
        expect(wrapper.text()).toContain('Les mots de passe ne correspondent pas.');
    });

    it('affiche le message d\'erreur renvoyé par le serveur lors d\'un login raté', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Identifiants incorrects.' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.find('input[type="email"]').setValue('test@example.com');
        await wrapper.find('input[type="password"]').setValue('wrongpassword');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Identifiants incorrects.');
    });

    it('affiche une erreur si le serveur est injoignable', async () => {
        global.fetch.mockRejectedValue(new Error('Failed to fetch'));
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.find('input[type="email"]').setValue('test@example.com');
        await wrapper.find('input[type="password"]').setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Impossible de contacter le serveur.');
    });

    it('stocke le token et navigue vers /dashboard si la connexion réussit', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ appToken: 'final-token-xyz' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.find('input[type="email"]').setValue('gardien@test.com');
        await wrapper.find('input[type="password"]').setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(localStorage.getItem('app_token')).toBe('final-token-xyz');
        expect(router.currentRoute.value.path).toBe('/dashboard');
    });

    it('bascule sur l\'onglet "bungie-redirect" si bungieRequired est true', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ bungieRequired: true, tempToken: 'temp-tok' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.find('input[type="email"]').setValue('gardien@test.com');
        await wrapper.find('input[type="password"]').setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Connexion à Bungie.net...');
    });

    it('bascule sur l\'onglet "bungie-redirect" après inscription réussie', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ tempToken: 'temp-register-tok' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.findAll('.tab-btn')[1].trigger('click');
        const passwordInputs = wrapper.findAll('[autocomplete="new-password"]');
        await wrapper.find('input[type="email"]').setValue('nouveau@test.com');
        await passwordInputs[0].setValue('password123');
        await passwordInputs[1].setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Connexion à Bungie.net...');
    });

    it('affiche l\'erreur serveur si l\'inscription échoue', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Email déjà utilisé.' }),
        });
        const wrapper = mount(LoginView, { global: { plugins: [router] } });
        await wrapper.findAll('.tab-btn')[1].trigger('click');
        const passwordInputs = wrapper.findAll('[autocomplete="new-password"]');
        await wrapper.find('input[type="email"]').setValue('exist@test.com');
        await passwordInputs[0].setValue('password123');
        await passwordInputs[1].setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Email déjà utilisé.');
    });
});
