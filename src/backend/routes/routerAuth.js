const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'guardian-ledger-dev-secret-changeme';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── POST /api/auth/register ───────────────────────────────────────────────
// Crée un compte email/mdp, renvoie un tempToken pour lier Bungie ensuite
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Email et mot de passe requis.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: 'Email invalide.' });
    if (password.length < 8)
        return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères).' });

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

        const hash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({ data: { email, password: hash } });

        const tempToken = jwt.sign(
            { userId: user.id, type: 'link_bungie' },
            JWT_SECRET,
            { expiresIn: '10m' }
        );
        res.json({ tempToken });
    } catch (err) {
        console.error('Erreur register:', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
// Connexion email/mdp. Si Bungie pas encore lié, renvoie tempToken.
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Email et mot de passe requis.' });

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Identifiants incorrects.' });

        // Bungie pas encore lié : il faut passer par OAuth
        if (!user.bungieMembershipId) {
            const tempToken = jwt.sign(
                { userId: user.id, type: 'link_bungie' },
                JWT_SECRET,
                { expiresIn: '10m' }
            );
            return res.json({ bungieRequired: true, tempToken });
        }

        // Tout est OK : on émet le JWT final
        const appToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                displayName: user.displayName,
                bungieMembershipId: user.bungieMembershipId,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ appToken, displayName: user.displayName });
    } catch (err) {
        console.error('Erreur login:', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// ─── GET /api/auth/bungie-connect?state=<tempToken> ───────────────────────
// Lance le flux OAuth Bungie en passant le tempToken comme "state"
router.get('/bungie-connect', (req, res) => {
    const { state } = req.query;
    if (!state) return res.status(400).json({ error: 'State manquant.' });

    const clientId = process.env.CLIENT_ID;
    const redirectUrl =
        `https://www.bungie.net/en/OAuth/Authorize?client_id=${clientId}` +
        `&response_type=code&state=${encodeURIComponent(state)}`;
    res.redirect(redirectUrl);
});

// ─── GET /api/auth/callback ────────────────────────────────────────────────
// Callback Bungie OAuth : lie le compte, émet le JWT final
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    // Vérifier le state / récupérer userId
    let userId = null;
    if (state) {
        try {
            const decoded = jwt.verify(state, JWT_SECRET);
            if (decoded.type === 'link_bungie') userId = decoded.userId;
        } catch {
            return res.status(400).send('Session expirée. Veuillez recommencer la connexion.');
        }
    }

    try {
        // Échanger le code contre le token Bungie
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);

        const tokenResponse = await axios.post(
            'https://www.bungie.net/platform/app/oauth/token/',
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-API-Key': process.env.BUNGIE_API_KEY,
                },
            }
        );

        const bungieToken = tokenResponse.data.access_token;
        const bungieMembershipId = String(tokenResponse.data.membership_id);

        // Récupérer le displayName Bungie
        const membershipsResponse = await axios.get(
            `https://www.bungie.net/Platform/User/GetMembershipsById/${bungieMembershipId}/254/`,
            {
                headers: {
                    'X-API-Key': process.env.BUNGIE_API_KEY,
                    'Authorization': `Bearer ${bungieToken}`,
                },
            }
        );

        const bungieData = membershipsResponse.data.Response;
        const displayName =
            bungieData.bungieNetUser?.uniqueName ||
            bungieData.destinyMemberships?.[0]?.displayName ||
            'Gardien';

        // Lier le compte en DB
        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    bungieMembershipId,
                    bungieAccessToken: bungieToken,
                    displayName,
                },
            });
        }

        // Récupérer l'utilisateur final
        const user = userId
            ? await prisma.user.findUnique({ where: { id: userId } })
            : await prisma.user.findUnique({ where: { bungieMembershipId } });

        if (!user) return res.status(404).send('Utilisateur introuvable.');

        // Émettre le JWT final de l'app
        const appToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                displayName: user.displayName,
                bungieMembershipId: user.bungieMembershipId,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.redirect(`${FRONTEND_URL}/dashboard?appToken=${appToken}`);
    } catch (error) {
        console.error('Erreur callback Bungie:', error.response?.data || error.message);
        res.status(500).send("Erreur lors de l'authentification Bungie.");
    }
});

module.exports = router;