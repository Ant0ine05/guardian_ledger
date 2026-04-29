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
const ARMOR_BUCKETS  = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);

const BUCKET_LABEL = {
    1498876634: 'Cinétique',
    2465295065: 'Énergie',
    953998645:  'Puissance',
    3448274439: 'Casque',
    3551918588: 'Gantelets',
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

        // 1. Memberships Destiny 2
        const membRes = await axios.get(
            `https://www.bungie.net/Platform/User/GetMembershipsById/${user.bungieMembershipId}/254/`,
            { headers }
        );
        const memberships = membRes.data.Response?.destinyMemberships;
        if (!memberships?.length)
            return res.status(404).json({ error: 'Aucun compte Destiny 2 trouvé.' });

        const { membershipId, membershipType } = memberships[0];

        // 2. Profil complet : personnages + équipement + inventaire + instances
        const profileRes = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=200,201,205,300`,
            { headers }
        );
        const profile = profileRes.data.Response;

        // 3. Tous les personnages triés par date de jeu
        const charsData = profile.characters?.data || {};
        const charIds   = Object.keys(charsData).sort(
            (a, b) => new Date(charsData[b].dateLastPlayed) - new Date(charsData[a].dateLastPlayed)
        );

        // 4. Instances (puissance par item)
        const instances = profile.itemComponents?.instances?.data || {};

        // 5. Cartes personnages : un slot équipé par bucket
        const characterCards = charIds.map(cId => {
            const c           = charsData[cId];
            const equippedRaw = profile.characterEquipment?.data?.[cId]?.items || [];
            const equipped    = equippedRaw
                .map((it, i) => buildItem(it.itemHash, it.itemInstanceId, instances, i))
                .filter(Boolean);

            let subclassName = '';
            for (const it of equippedRaw) {
                const def = getDefinition('DestinyInventoryItemDefinition', String(it.itemHash));
                if (def?.itemType === 16) { subclassName = def.displayProperties?.name || ''; break; }
            }

            const slot = (bHash) => equipped.find(i => i.bucketHash === bHash) || null;

            return {
                id:       cId,
                class:    CLASS_MAP[c.classType] ?? 'Gardien',
                race:     RACE_MAP[c.raceType]   ?? '',
                subclass: subclassName,
                power:    c.light,
                emblemPath:           c.emblemPath           ? `https://www.bungie.net${c.emblemPath}`           : '',
                emblemBackgroundPath: c.emblemBackgroundPath ? `https://www.bungie.net${c.emblemBackgroundPath}` : '',
                weapons: {
                    kinetic: slot(1498876634),
                    energy:  slot(2465295065),
                    power:   slot(953998645),
                },
                armor: {
                    helmet:    slot(3448274439),
                    chest:     slot(14239492),
                    gauntlets: slot(3551918588),
                    legs:      slot(20886954),
                    classItem: slot(1585787867),
                },
            };
        });

        // 6. Inventaire combiné de tous les personnages (pour la Vault)
        const allItems = [];
        for (const cId of charIds) {
            const eq  = profile.characterEquipment?.data?.[cId]?.items  || [];
            const inv = profile.characterInventories?.data?.[cId]?.items || [];
            [...eq, ...inv].forEach((it, i) => {
                const item = buildItem(it.itemHash, it.itemInstanceId, instances, i);
                if (item) allItems.push(item);
            });
        }

        const weapons = dedupe(allItems.filter(i => WEAPON_BUCKETS.has(i.bucketHash)));
        const armor   = dedupe(allItems.filter(i => ARMOR_BUCKETS.has(i.bucketHash) && i.power > 0));

        res.json({
            characters:  characterCards,
            weapons,
            armor,
            displayName: user.displayName,
        });

    } catch (err) {
        console.error('Erreur /me/destiny:', err.response?.data || err.message);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée. Reconnecte-toi.' });
        res.status(500).json({ error: 'Erreur lors de la récupération des données Bungie.' });
    }
});

module.exports = router;
