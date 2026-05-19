// manifestService instancie la DB au niveau du module (code top-level).
// On utilise jest.resetModules() + jest.doMock() pour réinitialiser les mocks
// avant chaque require du module.

jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('manifestService - getDefinition', () => {
    let getDefinition;
    let mockGet;
    let mockPrepare;

    beforeEach(() => {
        jest.resetModules();

        mockGet = jest.fn();
        mockPrepare = jest.fn().mockReturnValue({ get: mockGet });

        jest.doMock('better-sqlite3', () =>
            jest.fn().mockImplementation(() => ({ prepare: mockPrepare }))
        );
        jest.doMock('dotenv', () => ({ config: jest.fn() }));

        // Require après les mocks pour que le constructeur Database soit intercepté
        getDefinition = require('../../../src/backend/services/manifestService').getDefinition;
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('retourne l\'objet parsé si la ligne est trouvée en base', () => {
        const itemDef = { displayProperties: { name: 'Gjallarhorn', icon: '/img/gjally.jpg' } };
        mockGet.mockReturnValue({ json: JSON.stringify(itemDef) });
        const result = getDefinition('DestinyInventoryItemDefinition', 1274330687);
        expect(result).toEqual(itemDef);
        expect(mockPrepare).toHaveBeenCalledWith(
            'SELECT json FROM DestinyInventoryItemDefinition WHERE id = ?'
        );
    });

    it('retourne null si la ligne n\'est pas trouvée', () => {
        mockGet.mockReturnValue(null);
        const result = getDefinition('DestinyInventoryItemDefinition', 99999);
        expect(result).toBeNull();
    });

    it('retourne null et ne propage pas l\'exception en cas d\'erreur SQL', () => {
        mockPrepare.mockImplementation(() => {
            throw new Error('no such table: InvalidTable');
        });
        expect(() => getDefinition('InvalidTable', 1)).not.toThrow();
        expect(getDefinition('InvalidTable', 1)).toBeNull();
    });

    it('convertit le hash en entier 32-bit signé avant la requête SQL', () => {
        mockGet.mockReturnValue(null);
        // 0xFFFFFF00 = 4294967040 en non-signé → -256 en signé 32-bit
        getDefinition('DestinyInventoryItemDefinition', 0xFFFFFF00);
        expect(mockGet).toHaveBeenCalledWith(-256);
    });

    it('fait appel à prepare avec le bon nom de table', () => {
        mockGet.mockReturnValue(null);
        getDefinition('DestinyStatDefinition', 123);
        expect(mockPrepare).toHaveBeenCalledWith(
            'SELECT json FROM DestinyStatDefinition WHERE id = ?'
        );
    });
});
