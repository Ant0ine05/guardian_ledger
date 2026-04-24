const express = require('express');
const router = express.Router();
const axios = require('axios');
const prisma = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { getDefinition } = require('../services/manifestService');

// ── Mappings ──────────────────────────────────────────────────────────────
const TIER_MAP  = { 6: 'exotic', 5: 'legendary', 4: 'rare', 3: 'uncommon', 2: 'common' };
const CLASS_MAP = { 0: 'Titan', 1: 'Chasseur', 2: 'Arcaniste' };
const RACE_MAP  = { 0: 'Humain', 1: 'Éveillé', 2: 'Exo' };

const WEAPON_BUCKETS = new Set([1498876634, 2465295065, 953998645]);
const ARMOR_BUCKETS  = new Set([3448274439, 3551918588, 14239492, 20886954]);

const BUCKET_LABEL = {
    1498876634: 'Cinétique',
    2465295065: 'Énergie',
    953998645:  'Puissance',
    3448274439: 'Casque',
    3551918588: 'Mains',
    14239492:   'Torse',
    20886954:   'Jambes',
    1585787867: 'Classe',
};

// ── Helper : construit un objet item à partir du hash + instanceId ────────
function buildItem(itemHash, itemInstanceId, instances, index) {
    const def = getDefinition('DestinyInventoryItemDefinition', String(itemHash));
    if (!def) return null;

    const bucketHash = def.inventory?.bucketTypeHash;
    const power      = instances[itemInstanceId]?.primaryStat?.value || 0;
    const rarity     = TIER_MAP[def.inventory?.tierType] || 'common';
    const icon       = def.displayProperties?.icon
        ? `https://www.bungie.net${def.displayProperties.icon}`
        : '';

    return {
        id:         itemInstanceId || `${itemHash}_${index}`,
        name:       def.displayProperties?.name || 'Inconnu',
        icon,
        power,
        rarity,
        type:       BUCKET_LABEL[bucketHash] || '',
        bucketHash,
    };
}

function dedupe(items) {
    const seen = new Set();
    return items.filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id); return true;
    });
}

// ── GET /api/me/destiny ───────────────────────────────────────────────────
router.get('/destiny', requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.bungieAccessToken)
            return res.status(401).json({ error: 'Token Bungie manquant. Reconnecte-toi.' });

        const headers = {
            'X-API-Key':     process.env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${user.bungieAccessToken}`,
        };

        // 1. Récupère les memberships Destiny 2
        const membRes = await axios.get(
            `https://www.bungie.net/Platform/User/GetMembershipsById/${user.bungieMembershipId}/254/`,
            { headers }
        );
        const memberships = membRes.data.Response?.destinyMemberships;
        if (!memberships?.length)
            return res.status(404).json({ error: 'Aucun compte Destiny 2 trouvé.' });

        const { membershipId, membershipType } = memberships[0];

        // 2. Fetch profil complet : personnages + équipement + inventaire + instances
        const profileRes = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=200,201,205,300`,
            { headers }
        );
        const profile = profileRes.data.Response;

        // 3. Personnage le plus récemment joué
        const characters = profile.characters?.data || {};
        const charId = Object.keys(characters).sort(
            (a, b) => new Date(characters[b].dateLastPlayed) - new Date(characters[a].dateLastPlayed)
        )[0];
        const char = characters[charId];

        // 4. Instances (power level par item)
        const instances = profile.itemComponents?.instances?.data || {};

        // 5. Items équipés + inventaire du personnage
        const equippedRaw   = profile.characterEquipment?.data?.[charId]?.items || [];
        const inventoryRaw  = profile.characterInventories?.data?.[charId]?.items || [];

        // 6. Construit tous les items
        const allEquipped  = equippedRaw.map((it, i) => buildItem(it.itemHash, it.itemInstanceId, instances, i)).filter(Boolean);
        const allInventory = inventoryRaw.map((it, i) => buildItem(it.itemHash, it.itemInstanceId, instances, i + 1000)).filter(Boolean);

        // 7. Sous-classe (itemType 16)
        let subclassName = '';
        for (const item of equippedRaw) {
            const def = getDefinition('DestinyInventoryItemDefinition', String(item.itemHash));
            if (def?.itemType === 16) { subclassName = def.displayProperties?.name || ''; break; }
        }

        // 8. Sépare armes / armures
        const weapons = dedupe([...allEquipped, ...allInventory].filter(i => WEAPON_BUCKETS.has(i.bucketHash)));
        const armor   = dedupe([...allEquipped, ...allInventory].filter(i => ARMOR_BUCKETS.has(i.bucketHash) && i.power > 0));

        // 9. Slots visibles dans la fiche personnage (armes + armures équipées avec power)
        const equippedForCard = allEquipped
            .filter(i => (WEAPON_BUCKETS.has(i.bucketHash) || ARMOR_BUCKETS.has(i.bucketHash)) && i.power > 0)
            .slice(0, 4);

        res.json({
            character: {
                class:       CLASS_MAP[char.classType] ?? 'Gardien',
                race:        RACE_MAP[char.raceType]   ?? '',
                subclass:    subclassName,
                power:       char.light,
                seasonLevel: 0,
                xpPercent:   0,
                equipped:    equippedForCard,
            },
            weapons,
            armor,
            displayName: user.displayName,
        });

    } catch (err) {
        console.error('Erreur /me/destiny:', err.response?.data || err.message);

        // Token Bungie expiré → 401 pour forcer la reconnexion
        if (err.response?.status === 401) {
            return res.status(401).json({ error: 'Session Bungie expirée. Reconnecte-toi.' });
        }
        res.status(500).json({ error: 'Erreur lors de la récupération des données Bungie.' });
    }
});

module.exports = router;
