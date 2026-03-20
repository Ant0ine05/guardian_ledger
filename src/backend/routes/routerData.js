const express = require('express');
const router = express.Router();
const { getDefinition } = require('../services/manifestService');

// Route : http://localhost:3000/api/data/item/2264350288
router.get('/item/:hash', (req, res) => {
    const item = getDefinition('DestinyStatDefinition', req.params.hash);
    
    if (item) {
        res.json({
            name: item.displayProperties.name,
            icon: `https://www.bungie.net${item.displayProperties.icon}`,
            type: item.itemTypeDisplayName
        });
    } else {
        res.status(404).json({ error: "Item introuvable" });
    }
});

// CETTE LIGNE EST LE REMÈDE À TON ERREUR TYPEERROR
module.exports = router;