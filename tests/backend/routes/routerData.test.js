const request = require('supertest');
const express = require('express');

// ── Mocks ─────────────────────────────────────────────────────────────────
jest.mock('../../../src/backend/services/manifestService', () => ({
    getDefinition: jest.fn(),
}));

// ── Imports après mocks ───────────────────────────────────────────────────
const { getDefinition } = require('../../../src/backend/services/manifestService');
const routerData = require('../../../src/backend/routes/routerData');

// ── App Express minimale ──────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/data', routerData);

// ─────────────────────────────────────────────────────────────────────────
describe('GET /api/data/item/:hash', () => {
    beforeEach(() => jest.clearAllMocks());

    it('retourne le nom, l\'icône et le type si l\'item est trouvé dans le manifest', async () => {
        getDefinition.mockReturnValue({
            displayProperties: {
                name: 'Gjallarhorn',
                icon: '/common/destiny2_content/icons/gjally.jpg',
            },
            itemTypeDisplayName: 'Arme de puissance',
        });

        const res = await request(app).get('/api/data/item/1274330687');

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Gjallarhorn');
        expect(res.body.icon).toBe('https://www.bungie.net/common/destiny2_content/icons/gjally.jpg');
        expect(res.body.type).toBe('Arme de puissance');
        expect(getDefinition).toHaveBeenCalledWith('DestinyStatDefinition', '1274330687');
    });

    it('retourne 404 si le hash est introuvable dans le manifest', async () => {
        getDefinition.mockReturnValue(null);

        const res = await request(app).get('/api/data/item/99999999');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Item introuvable');
    });
});
