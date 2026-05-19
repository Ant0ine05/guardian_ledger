// ── Mocks (avant tout require du code source) ─────────────────────────────
jest.mock('../../../src/backend/db', () => ({
    user: { findUnique: jest.fn(), update: jest.fn() },
}));

jest.mock('../../../src/backend/middleware/requireAuth', () => (req, res, next) => next());

jest.mock('../../../src/backend/services/manifestService', () => ({
    getDefinition: jest.fn(),
}));

jest.mock('axios');

// ── Imports après mocks ───────────────────────────────────────────────────
const { _helpers } = require('../../../src/backend/routes/routerMe');
const { buildItem, dedupe, TIER_MAP, CLASS_MAP, RACE_MAP, BUCKET_LABEL } = _helpers;
const { getDefinition } = require('../../../src/backend/services/manifestService');

// ─────────────────────────────────────────────────────────────────────────
describe('dedupe', () => {
    it('retourne une liste vide si l\'entrée est vide', () => {
        expect(dedupe([])).toEqual([]);
    });

    it('retourne les items inchangés si tous les ids sont uniques', () => {
        const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        expect(dedupe(items)).toEqual(items);
    });

    it('supprime les doublons en gardant uniquement la première occurrence', () => {
        const items = [
            { id: 'arme1', name: 'original' },
            { id: 'arme2' },
            { id: 'arme1', name: 'doublon' },
        ];
        const result = dedupe(items);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('original');
        expect(result[1].id).toBe('arme2');
    });

    it('supprime plusieurs doublons du même id', () => {
        const items = [{ id: 'x' }, { id: 'x' }, { id: 'x' }, { id: 'y' }];
        const result = dedupe(items);
        expect(result).toHaveLength(2);
        expect(result.map(i => i.id)).toEqual(['x', 'y']);
    });

    it('ne modifie pas la liste originale', () => {
        const items = [{ id: 'a' }, { id: 'a' }];
        dedupe(items);
        expect(items).toHaveLength(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('TIER_MAP', () => {
    it('mappe toutes les raretés Destiny 2 correctement', () => {
        expect(TIER_MAP[6]).toBe('exotic');
        expect(TIER_MAP[5]).toBe('legendary');
        expect(TIER_MAP[4]).toBe('rare');
        expect(TIER_MAP[3]).toBe('uncommon');
        expect(TIER_MAP[2]).toBe('common');
    });
});

describe('CLASS_MAP', () => {
    it('mappe les trois classes de gardien', () => {
        expect(CLASS_MAP[0]).toBe('Titan');
        expect(CLASS_MAP[1]).toBe('Chasseur');
        expect(CLASS_MAP[2]).toBe('Arcaniste');
    });
});

describe('RACE_MAP', () => {
    it('mappe les trois races correctement', () => {
        expect(RACE_MAP[0]).toBe('Humain');
        expect(RACE_MAP[1]).toBe('Éveillé');
        expect(RACE_MAP[2]).toBe('Exo');
    });
});

describe('BUCKET_LABEL', () => {
    it('mappe les buckets d\'armes correctement', () => {
        expect(BUCKET_LABEL[1498876634]).toBe('Cinétique');
        expect(BUCKET_LABEL[2465295065]).toBe('Énergie');
        expect(BUCKET_LABEL[953998645]).toBe('Puissance');
    });

    it('mappe les buckets d\'armure correctement', () => {
        expect(BUCKET_LABEL[3448274439]).toBe('Casque');
        expect(BUCKET_LABEL[3551918588]).toBe('Gantelets');
        expect(BUCKET_LABEL[14239492]).toBe('Torse');
        expect(BUCKET_LABEL[20886954]).toBe('Jambes');
        expect(BUCKET_LABEL[1585787867]).toBe('Classe');
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('buildItem', () => {
    beforeEach(() => jest.clearAllMocks());

    it('retourne null si la définition est introuvable dans le manifest', () => {
        getDefinition.mockReturnValue(null);
        expect(buildItem(12345, 'inst1', {}, 0)).toBeNull();
    });

    it('construit un objet item complet avec toutes les propriétés', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Gjallarhorn', icon: '/img/gjally.jpg' },
            inventory: { tierType: 6, bucketTypeHash: 1498876634 },
            classType: 255,
        });
        const instances = { inst1: { primaryStat: { value: 1810 } } };
        const item = buildItem(1274330687, 'inst1', instances, 0);

        expect(item).toMatchObject({
            id: 'inst1',
            itemHash: 1274330687,
            name: 'Gjallarhorn',
            rarity: 'exotic',
            power: 1810,
            icon: 'https://www.bungie.net/img/gjally.jpg',
            type: 'Cinétique',
            bucketHash: 1498876634,
            instanced: true,
        });
    });

    it('utilise `${itemHash}_${index}` comme id si instanceId est absent', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Item sans instance', icon: '' },
            inventory: { tierType: 2, bucketTypeHash: 0 },
            classType: 0,
        });
        const item = buildItem(9999, null, {}, 3);
        expect(item.id).toBe('9999_3');
        expect(item.instanced).toBe(false);
    });

    it('retourne power=0 si l\'instance n\'a pas de primaryStat', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Test', icon: '' },
            inventory: { tierType: 2, bucketTypeHash: 0 },
            classType: 0,
        });
        const item = buildItem(111, 'inst_sans_stat', {}, 0);
        expect(item.power).toBe(0);
    });

    it('préfixe l\'icône avec l\'URL Bungie si un chemin est fourni', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Test', icon: '/common/destiny2_content/icons/test.jpg' },
            inventory: { tierType: 5, bucketTypeHash: 2465295065 },
            classType: 0,
        });
        const item = buildItem(222, null, {}, 0);
        expect(item.icon).toBe('https://www.bungie.net/common/destiny2_content/icons/test.jpg');
    });

    it('retourne une icône vide si la définition n\'a pas de champ icon', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Sans icône' },
            inventory: { tierType: 2, bucketTypeHash: 0 },
            classType: 0,
        });
        const item = buildItem(333, null, {}, 0);
        expect(item.icon).toBe('');
    });

    it('mappe guardianClass="Universel" pour un classType hors 0/1/2', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Universel', icon: '' },
            inventory: { tierType: 5, bucketTypeHash: 0 },
            classType: 255,
        });
        const item = buildItem(444, null, {}, 0);
        expect(item.guardianClass).toBe('Universel');
    });

    it('mappe guardianClass="Chasseur" pour classType=1', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Armure Chasseur', icon: '' },
            inventory: { tierType: 4, bucketTypeHash: 3448274439 },
            classType: 1,
        });
        const item = buildItem(555, null, {}, 0);
        expect(item.guardianClass).toBe('Chasseur');
    });

    it('utilise "Inconnu" comme nom si displayProperties.name est absent', () => {
        getDefinition.mockReturnValue({
            displayProperties: {},
            inventory: { tierType: 2, bucketTypeHash: 0 },
            classType: 0,
        });
        const item = buildItem(666, null, {}, 0);
        expect(item.name).toBe('Inconnu');
    });

    it('retourne rarity="common" pour un tierType non reconnu', () => {
        getDefinition.mockReturnValue({
            displayProperties: { name: 'Inconnu', icon: '' },
            inventory: { tierType: 99, bucketTypeHash: 0 },
            classType: 0,
        });
        const item = buildItem(777, null, {}, 0);
        expect(item.rarity).toBe('common');
    });
});
