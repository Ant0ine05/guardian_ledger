jest.mock('axios');

const axios = require('axios');
const { bungieRequest } = require('../../../src/backend/services/bungieService');

describe('bungieService - bungieRequest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BUNGIE_API_KEY = 'test-api-key-123';
    });

    it('appelle le bon endpoint Bungie avec le header X-API-Key', async () => {
        axios.get.mockResolvedValue({ data: { Response: { manifest: 'data' } } });
        const result = await bungieRequest('/Destiny2/Manifest/');
        expect(axios.get).toHaveBeenCalledWith(
            'https://www.bungie.net/Platform/Destiny2/Manifest/',
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-API-Key': 'test-api-key-123' }),
            })
        );
        expect(result).toEqual({ manifest: 'data' });
    });

    it('ajoute le header Authorization si un accessToken est fourni', async () => {
        axios.get.mockResolvedValue({ data: { Response: {} } });
        await bungieRequest('/User/GetMembershipsForCurrentUser/', 'access-token-xyz');
        const callHeaders = axios.get.mock.calls[0][1].headers;
        expect(callHeaders['Authorization']).toBe('Bearer access-token-xyz');
    });

    it('n\'inclut pas le header Authorization si aucun token n\'est passé', async () => {
        axios.get.mockResolvedValue({ data: { Response: {} } });
        await bungieRequest('/Destiny2/Manifest/');
        const callHeaders = axios.get.mock.calls[0][1].headers;
        expect(callHeaders['Authorization']).toBeUndefined();
    });

    it('retourne directement la propriété Response de la réponse', async () => {
        const mockResponse = { characters: { data: { char1: {} } } };
        axios.get.mockResolvedValue({ data: { Response: mockResponse } });
        const result = await bungieRequest('/Destiny2/Profile/');
        expect(result).toBe(mockResponse);
    });

    it('propage l\'erreur en cas d\'échec réseau', async () => {
        axios.get.mockRejectedValue(new Error('ECONNREFUSED'));
        await expect(bungieRequest('/Destiny2/Manifest/')).rejects.toThrow('ECONNREFUSED');
    });
});
