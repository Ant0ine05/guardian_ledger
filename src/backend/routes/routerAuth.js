const express = require('express');
const router = express.Router();
const axios = require('axios')

// Route pour lancer la connexion
router.get('/login', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUrl = `https://www.bungie.net/en/OAuth/Authorize?client_id=${clientId}&response_type=code`;
    res.redirect(redirectUrl);
});

// Route de retour (callback)
router.get('/callback', async (req, res) => {
    const codeRecu = req.query.code;

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', codeRecu);
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);

        const response = await axios.post('https://www.bungie.net/platform/app/oauth/token/', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': process.env.BUNGIE_API_KEY
            }
        });
        console.log("Réponse de l'API Bungie :", response.data);
        const token = response.data.access_token;
        const bungieMembershipId = response.data.membership_id;

        // Récupérer les memberships Destiny 2 via le Bungie ID
        const membershipsResponse = await axios.get(
            `https://www.bungie.net/Platform/User/GetMembershipsById/${bungieMembershipId}/254/`,
            {
                headers: {
                    'X-API-Key': process.env.BUNGIE_API_KEY,
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const destinyMemberships = membershipsResponse.data.Response.destinyMemberships;
        if (!destinyMemberships || destinyMemberships.length === 0) {
            return res.status(404).json({ erreur: "Aucun compte Destiny 2 trouvé." });
        }

        const { membershipId, membershipType } = destinyMemberships[0];

        // Récupérer le profil Destiny 2
        const profileResponse = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,200`,
            {
                headers: {
                    'X-API-Key': process.env.BUNGIE_API_KEY,
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // res.json({
        //     statut: "Authentification Complète !",
        //     accessToken: token,
        //     vraiNom: profileResponse.data.Response.profile.data.userInfo.displayName,
        //     personnages: profileResponse.data.Response.characters.data
        // });
        
        const frontendUrl = process.env.FRONTEND_URL;

        res.redirect(`${frontendUrl}/?token=${token}&membershipId=${bungieMembershipId}`);
    } catch (error) {
        console.error("Erreur :", error.response?.data || error.message);
        res.status(500).json({ erreur: "Erreur lors de l'authentification." });
    }
});

module.exports = router; // INDISPENSABLE