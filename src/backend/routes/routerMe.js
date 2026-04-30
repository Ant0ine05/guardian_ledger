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
        type:          BUCKET_LABEL[bucketHash] || '',
        bucketHash,
        guardianClass: { 0: 'Titan', 1: 'Chasseur', 2: 'Arcaniste' }[def.classType] ?? 'Universel',
        instanced:     !!itemInstanceId,
    };
}

function dedupe(items) {
    const seen = new Set();
    return items.filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id); return true;
    });
}

// ── Refresh du token Bungie si expiré ─────────────────────────────────────
async function ensureFreshToken(user) {
    const now = new Date();
    const expiresAt = user.bungieTokenExpiresAt ? new Date(user.bungieTokenExpiresAt) : null;
    // Refresh si expiré ou expire dans moins de 5 minutes
    if (expiresAt && now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
        return user.bungieAccessToken;
    }

    if (!user.bungieRefreshToken)
        throw new Error('Refresh token Bungie manquant. Reconnecte ton compte Bungie.');

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', user.bungieRefreshToken);
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);

    const tokenRes = await axios.post(
        'https://www.bungie.net/platform/app/oauth/token/',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': process.env.BUNGIE_API_KEY } }
    );

    const newAccessToken    = tokenRes.data.access_token;
    const newRefreshToken   = tokenRes.data.refresh_token;
    const newExpiresAt      = new Date(Date.now() + tokenRes.data.expires_in * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            bungieAccessToken:    newAccessToken,
            bungieRefreshToken:   newRefreshToken,
            bungieTokenExpiresAt: newExpiresAt,
        },
    });

    return newAccessToken;
}

// ── GET /api/me/destiny ───────────────────────────────────────────────────
router.get('/destiny', requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.bungieMembershipId)
            return res.status(401).json({ error: 'Compte Bungie non lié. Reconnecte-toi.' });

        const accessToken = await ensureFreshToken(user);
        const headers = {
            'X-API-Key':     process.env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`,
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

        // 2. Profil complet : coffre (102) + personnages + équipement + inventaire + instances
        const profileRes = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,200,201,205,300`,
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

        // 7. Vault (coffre partagé — composant 102)
        const VAULT_BUCKET = 138197802;
        const profileInventoryItems = profile.profileInventory?.data?.items || [];
        const vaultRaw = profileInventoryItems.filter(it => it.bucketHash === VAULT_BUCKET);
        const vaultItems = [];
        vaultRaw.forEach((it, i) => {
            const item = buildItem(it.itemHash, it.itemInstanceId, instances, i);
            if (item) vaultItems.push(item);
        });

        const vault = {
            kinetic:   vaultItems.filter(i => i.bucketHash === 1498876634),
            energy:    vaultItems.filter(i => i.bucketHash === 2465295065),
            power:     vaultItems.filter(i => i.bucketHash === 953998645),
            helmet:    vaultItems.filter(i => i.bucketHash === 3448274439),
            gauntlets: vaultItems.filter(i => i.bucketHash === 3551918588),
            chest:     vaultItems.filter(i => i.bucketHash === 14239492),
            legs:      vaultItems.filter(i => i.bucketHash === 20886954),
            classItem: vaultItems.filter(i => i.bucketHash === 1585787867),
        };

        // Capacité max du vault depuis le manifest
        const vaultBucketDef = getDefinition('DestinyInventoryBucketDefinition', String(VAULT_BUCKET));
        const vaultCapacity  = vaultBucketDef?.itemCount ?? 1000;

        res.json({
            characters:    characterCards,
            weapons,
            armor,
            vault,
            vaultCapacity,
            displayName:   user.displayName,
        });

    } catch (err) {
        console.error('Erreur /me/destiny:', err.response?.data || err.message);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée. Reconnecte-toi.' });
        res.status(500).json({ error: 'Erreur lors de la récupération des données Bungie.' });
    }
});

// ── GET /api/me/item-detail/:instanceId ──────────────────────────────────
const PERK_SKIP = ['shader', 'ornament', 'masterwork', 'empty', 'mod_armor_energy', 'holographic'];

router.get('/item-detail/:instanceId', requireAuth, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.bungieMembershipId)
            return res.status(401).json({ error: 'Compte Bungie non lié.' });

        const accessToken = await ensureFreshToken(user);
        const headers = {
            'X-API-Key':     process.env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`,
        };

        const membRes = await axios.get(
            `https://www.bungie.net/Platform/User/GetMembershipsById/${user.bungieMembershipId}/254/`,
            { headers }
        );
        const { membershipId, membershipType } = membRes.data.Response.destinyMemberships[0];

        const itemRes = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Item/${instanceId}/?components=304,305`,
            { headers }
        );
        const itemData = itemRes.data.Response;

        // Stats
        const statsRaw = itemData.stats?.data?.stats || {};
        const stats = [];
        for (const [statHash, statData] of Object.entries(statsRaw)) {
            if (statData.displayMaximum === 0 && statData.value === 0) continue;
            const statDef = getDefinition('DestinyStatDefinition', statHash);
            if (!statDef?.displayProperties?.name) continue;
            stats.push({
                name:  statDef.displayProperties.name,
                value: statData.value,
                max:   statData.displayMaximum || 100,
            });
        }

        // Perks (sockets)
        const socketsRaw = itemData.sockets?.data?.sockets || [];
        const perks = [];
        for (const socket of socketsRaw) {
            if (!socket.plugHash || !socket.isEnabled) continue;
            const plugDef = getDefinition('DestinyInventoryItemDefinition', String(socket.plugHash));
            if (!plugDef) continue;
            const name = plugDef.displayProperties?.name;
            const desc = plugDef.displayProperties?.description;
            if (!name) continue;
            const cat = plugDef.plug?.plugCategoryIdentifier || '';
            if (PERK_SKIP.some(x => cat.includes(x))) continue;
            if (!desc && !cat.includes('intrinsic')) continue;
            perks.push({
                name,
                description: desc || '',
                icon:        plugDef.displayProperties?.icon ? `https://www.bungie.net${plugDef.displayProperties.icon}` : '',
                isIntrinsic: cat.includes('intrinsic'),
            });
        }

        res.json({ stats, perks });

    } catch (err) {
        console.error('Erreur item-detail:', err.response?.data || err.message);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée.' });
        res.status(500).json({ error: 'Erreur lors de la récupération des détails.' });
    }
});

module.exports = router;
