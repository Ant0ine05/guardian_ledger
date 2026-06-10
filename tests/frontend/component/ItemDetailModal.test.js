import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ItemDetailModal from '../../../src/frontend/src/component/ItemDetailModal.vue';

// ── Données de test ──────────────────────────────────────────────────────
const FAKE_ITEM = {
    id: 'inst1',
    name: 'Gjallarhorn',
    icon: 'https://www.bungie.net/img/gjally.jpg',
    power: 1810,
    rarity: 'exotic',
    type: 'Cinétique',
    bucketHash: 1498876634,
    guardianClass: 'Universel',
    instanced: true,
    itemHash: 1274330687,
};

const FAKE_DETAIL = {
    stats: [
        { name: 'Impact',  value: 95, max: 100, noBar: false, order: 0 },
        { name: 'Portée',  value: 48, max: 100, noBar: false, order: 1 },
    ],
    sockets: [
        {
            index: 0,
            category: 'intrinsic',
            plugs: [{ hash: 1, name: 'Propergol de Wolf', description: 'Tire des roquettes.', icon: '', isActive: true }],
        },
        {
            index: 1,
            category: 'perk',
            plugs: [
                { hash: 2, name: 'Entraîneur',  description: 'Améliore la visée.',    icon: '', isActive: true  },
                { hash: 3, name: 'Résonnance', description: 'Synergies multiples.', icon: '', isActive: false },
            ],
        },
    ],
    flavorText: 'Ça mord.',
    source: 'Quête Exotique',
    itemHash: 1274330687,
};

const ARMOR_ITEM = {
    ...FAKE_ITEM,
    id: 'arm1',
    name: 'Casque du Vide',
    type: 'Casque',
    bucketHash: 3448274439,
    guardianClass: 'Titan',
    itemHash: 5555,
};

// Total des stats = 10+20+15+10+8+12 = 75 → tier S (≥ 68)
const ARMOR_DETAIL = {
    stats: [
        { name: 'Mobilité',     value: 10, max: 30, noBar: false, order: 0 },
        { name: 'Résilience',   value: 20, max: 30, noBar: false, order: 1 },
        { name: 'Récupération', value: 15, max: 30, noBar: false, order: 2 },
        { name: 'Discipline',   value: 10, max: 30, noBar: false, order: 3 },
        { name: 'Intellect',    value:  8, max: 30, noBar: false, order: 4 },
        { name: 'Force',        value: 12, max: 30, noBar: false, order: 5 },
    ],
    sockets: [],
    flavorText: '',
    source: '',
    itemHash: 5555,
};

const FAKE_CHAR = { id: 'char1', class: 'Titan', power: 1800 };

// ── Helper de montage ────────────────────────────────────────────────────
function mountModal(item, detail = null, loading = false, characters = []) {
    return mount(ItemDetailModal, {
        global: {
            stubs: { Teleport: { template: '<div class="teleport-stub"><slot /></div>' } },
        },
        props: { item, detail, loading, characters },
        attachTo: document.body,
    });
}

// ────────────────────────────────────────────────────────────────────────
describe('ItemDetailModal', () => {

    // ── Affichage de base ───────────────────────────────────────────────
    it('affiche le nom et la puissance de l\'item', () => {
        const wrapper = mountModal(FAKE_ITEM, FAKE_DETAIL);
        expect(wrapper.text()).toContain('Gjallarhorn');
        expect(wrapper.text()).toContain('1810');
        wrapper.unmount();
    });

    it('affiche le type et le texte de saveur (flavorText)', () => {
        const wrapper = mountModal(FAKE_ITEM, FAKE_DETAIL);
        expect(wrapper.text()).toContain('Cinétique');
        expect(wrapper.text()).toContain('Ça mord.');
        wrapper.unmount();
    });

    it('affiche le spinner de chargement quand loading=true', () => {
        const wrapper = mountModal(FAKE_ITEM, null, true);
        expect(wrapper.find('.idm-loading').exists()).toBe(true);
        wrapper.unmount();
    });

    // ── Statistiques ────────────────────────────────────────────────────
    it('affiche les statistiques avec leurs valeurs', () => {
        const wrapper = mountModal(FAKE_ITEM, FAKE_DETAIL);
        expect(wrapper.text()).toContain('Impact');
        expect(wrapper.text()).toContain('95');
        expect(wrapper.text()).toContain('Portée');
        expect(wrapper.text()).toContain('48');
        wrapper.unmount();
    });

    it('affiche les perks / sockets de l\'item', () => {
        const wrapper = mountModal(FAKE_ITEM, FAKE_DETAIL);
        expect(wrapper.text()).toContain('Propergol de Wolf');
        wrapper.unmount();
    });

    it('affiche le total d\'armure et le tier S pour un casque de 75 points', () => {
        const wrapper = mountModal(ARMOR_ITEM, ARMOR_DETAIL);
        expect(wrapper.text()).toContain('75');
        expect(wrapper.text()).toContain('S');
        wrapper.unmount();
    });

    // ── Item non-instancié ───────────────────────────────────────────────
    it('affiche "Pas de statistiques disponibles" pour un item non instancié', () => {
        // detail=null car la condition du template est v-else-if="detail" AVANT v-else-if="!item.instanced"
        const nonInstanced = { ...FAKE_ITEM, instanced: false };
        const wrapper = mountModal(nonInstanced, null);
        expect(wrapper.text()).toContain('Pas de statistiques disponibles');
        wrapper.unmount();
    });

    // ── Barre de transfert ───────────────────────────────────────────────
    it('n\'affiche pas la barre de transfert si l\'item n\'est pas instancié', () => {
        const nonInstanced = { ...FAKE_ITEM, instanced: false };
        const wrapper = mountModal(nonInstanced, null, false, [FAKE_CHAR]);
        expect(wrapper.find('.idm-transfer-bar').exists()).toBe(false);
        wrapper.unmount();
    });

    it('n\'affiche pas la barre de transfert si aucun personnage n\'est fourni', () => {
        const wrapper = mountModal(FAKE_ITEM, null, false, []);
        expect(wrapper.find('.idm-transfer-bar').exists()).toBe(false);
        wrapper.unmount();
    });

    it('affiche la barre de transfert si l\'item est instancié et des personnages existent', () => {
        const wrapper = mountModal(FAKE_ITEM, null, false, [FAKE_CHAR]);
        expect(wrapper.find('.idm-transfer-bar').exists()).toBe(true);
        wrapper.unmount();
    });

    // ── Émission d'événements ────────────────────────────────────────────
    it('émet "close" au clic sur le bouton de fermeture', async () => {
        const wrapper = mountModal(FAKE_ITEM);
        await wrapper.find('.idm-close').trigger('click');
        expect(wrapper.emitted('close')).toBeTruthy();
        wrapper.unmount();
    });

    it('émet "close" au clic sur l\'overlay', async () => {
        const wrapper = mountModal(FAKE_ITEM);
        await wrapper.find('.idm-overlay').trigger('click');
        expect(wrapper.emitted('close')).toBeTruthy();
        wrapper.unmount();
    });

    it('émet "transfer" vers un personnage avec le bon payload', async () => {
        const wrapper = mountModal(FAKE_ITEM, null, false, [FAKE_CHAR]);
        const charBtns = wrapper.findAll('.idm-transfer-btn.char');
        expect(charBtns.length).toBe(1);
        await charBtns[0].trigger('click');
        expect(wrapper.emitted('transfer')).toBeTruthy();
        const payload = wrapper.emitted('transfer')[0][0];
        expect(payload.instanceId).toBe('inst1');
        expect(payload.itemHash).toBe(1274330687);
        expect(payload.transferToVault).toBe(false);
        expect(payload.characterId).toBe('char1');
        wrapper.unmount();
    });

    it('émet "transfer" vers le coffre avec transferToVault=true', async () => {
        const wrapper = mountModal(FAKE_ITEM, null, false, [FAKE_CHAR]);
        await wrapper.find('.idm-transfer-btn.vault').trigger('click');
        const payload = wrapper.emitted('transfer')[0][0];
        expect(payload.transferToVault).toBe(true);
        expect(payload.instanceId).toBe('inst1');
        wrapper.unmount();
    });
});
