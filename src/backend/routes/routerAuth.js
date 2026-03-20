const express = require('express');
const router = express.Router();

// Route pour lancer la connexion
router.get('/login', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUrl = `https://www.bungie.net/en/OAuth/Authorize?client_id=${clientId}&response_type=code`;
    res.redirect(redirectUrl);
});

// Route de retour (callback)
router.get('/callback', (req, res) => {
    const code = req.query.code;
    res.json({ message: "Code reçu !", code: code });
});

module.exports = router; // INDISPENSABLE