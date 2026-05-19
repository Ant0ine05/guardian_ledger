const request = require('supertest');
const express = require('express');

// ── Mocks (avant tout require du code source) ─────────────────────────────
jest.mock('../../../src/backend/db', () => ({
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('$2b$12$mockedhashedpassword'),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
}));

jest.mock('axios');

// ── Imports après mocks ───────────────────────────────────────────────────
const prisma = require('../../../src/backend/db');
const bcrypt = require('bcryptjs');
const routerAuth = require('../../../src/backend/routes/routerAuth');

// ── App Express minimale ──────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/auth', routerAuth);

// ─────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    beforeEach(() => jest.clearAllMocks());

    it('retourne 400 si email et mot de passe sont absents', async () => {
        const res = await request(app).post('/api/auth/register').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email et mot de passe requis.');
    });

    it('retourne 400 si seul le mot de passe est absent', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'gardien@test.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email et mot de passe requis.');
    });

    it('retourne 400 si le format email est invalide', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'pas-un-email', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email invalide.');
    });

    it('retourne 400 si le mot de passe fait moins de 8 caractères', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'gardien@test.com', password: 'court' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Mot de passe trop court (min 8 caractères).');
    });

    it('retourne 409 si l\'email est déjà utilisé', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'gardien@test.com' });
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'gardien@test.com', password: 'password123' });
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Cet email est déjà utilisé.');
    });

    it('crée l\'utilisateur et retourne un tempToken', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue({ id: 2, email: 'nouveau@test.com' });
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'nouveau@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.tempToken).toBe('mock-jwt-token');
        expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('retourne 400 si email ou mot de passe est manquant', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'gardien@test.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email et mot de passe requis.');
    });

    it('retourne 401 si l\'utilisateur n\'existe pas', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'inconnu@test.com', password: 'password123' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Identifiants incorrects.');
    });

    it('retourne 401 si le mot de passe est incorrect', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'gardien@test.com',
            password: 'hashed',
            bungieMembershipId: '123',
        });
        bcrypt.compare.mockResolvedValue(false);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'gardien@test.com', password: 'mauvaismdp' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Identifiants incorrects.');
    });

    it('retourne bungieRequired=true si Bungie n\'est pas encore lié', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'gardien@test.com',
            password: 'hashed',
            bungieMembershipId: null,
        });
        bcrypt.compare.mockResolvedValue(true);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'gardien@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.bungieRequired).toBe(true);
        expect(res.body.tempToken).toBe('mock-jwt-token');
    });

    it('retourne appToken et displayName si la connexion est complète', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'gardien@test.com',
            password: 'hashed',
            bungieMembershipId: '456789012',
            displayName: 'GuardianXX#1234',
        });
        bcrypt.compare.mockResolvedValue(true);
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'gardien@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.appToken).toBe('mock-jwt-token');
        expect(res.body.displayName).toBe('GuardianXX#1234');
    });
});
