jest.mock('jsonwebtoken');

const requireAuth = require('../../../src/backend/middleware/requireAuth');
const jwt = require('jsonwebtoken');

describe('middleware requireAuth', () => {
    let req, res, next;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it('retourne 401 si le header Authorization est absent', () => {
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Non autorisé.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('retourne 401 si le header ne commence pas par "Bearer "', () => {
        req.headers.authorization = 'Basic dXNlcjpwYXNz';
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('retourne 401 si le token JWT est invalide ou expiré', () => {
        req.headers.authorization = 'Bearer invalid.token.here';
        jwt.verify.mockImplementation(() => {
            throw new Error('jwt malformed');
        });
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('appelle next() et attache req.user si le token est valide', () => {
        req.headers.authorization = 'Bearer valid.token.here';
        const payload = { userId: 42, email: 'gardien@example.com' };
        jwt.verify.mockReturnValue(payload);
        requireAuth(req, res, next);
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
