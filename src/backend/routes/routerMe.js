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

// ── Cache membership Destiny 2 (évite un appel Bungie par transfert) ────────
const membershipCache = new Map() // userId → { membershipType, membershipId }

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
        itemHash:   itemHash,
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
        membershipCache.set(req.user.userId, { membershipId, membershipType });

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
            const invRaw      = profile.characterInventories?.data?.[cId]?.items || [];
            const equipped    = equippedRaw
                .map((it, i) => buildItem(it.itemHash, it.itemInstanceId, instances, i))
                .filter(Boolean);

            let subclassName = '';
            for (const it of equippedRaw) {
                const def = getDefinition('DestinyInventoryItemDefinition', String(it.itemHash));
                if (def?.itemType === 16) { subclassName = def.displayProperties?.name || ''; break; }
            }

            const slot = (bHash) => equipped.find(i => i.bucketHash === bHash) || null;

            // Inventaire non-équipé du personnage (armes + armures seulement)
            const inventory = invRaw
                .map((it, i) => buildItem(it.itemHash, it.itemInstanceId, instances, i))
                .filter(i => i && i.power > 0 && (WEAPON_BUCKETS.has(i.bucketHash) || ARMOR_BUCKETS.has(i.bucketHash)))
                .sort((a, b) => b.power - a.power);

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
                inventory,
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
// Catégories de sockets à ignorer
const SOCK_SKIP = ['shader', 'ornament', 'masterwork', 'empty', 'mod_armor_energy',
                   'holographic', 'aspect', 'fragment', 'abilities', 'stasis',
                   'void.ability', 'arc.ability', 'solar.ability'];

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

        // 307=ItemCommonData(itemHash), 304=Stats, 305=Sockets, 310=ReusablePlugs
        const itemRes = await axios.get(
            `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Item/${instanceId}/?components=307,304,305,310`,
            { headers }
        );
        const itemData = itemRes.data.Response;

        // ── Définition item ──────────────────────────────────────────────
        const itemHash = itemData.item?.data?.itemHash;
        const itemDef  = itemHash ? getDefinition('DestinyInventoryItemDefinition', String(itemHash)) : null;

        // Ordre des stats depuis le StatGroup
        const sgHash   = itemDef?.stats?.statGroupHash;
        const sgDef    = sgHash ? getDefinition('DestinyStatGroupDefinition', String(sgHash)) : null;
        const statOrder = {};
        (sgDef?.scaledStats || []).forEach((s, i) => { statOrder[String(s.statHash)] = i; });

        // ── Stats ────────────────────────────────────────────────────────
        const statsRaw = itemData.stats?.data?.stats || {};
        const stats = [];
        for (const [statHash, statData] of Object.entries(statsRaw)) {
            if (statData.value === 0 && statData.displayMaximum === 0) continue;
            const statDef = getDefinition('DestinyStatDefinition', statHash);
            if (!statDef?.displayProperties?.name) continue;
            stats.push({
                name:  statDef.displayProperties.name,
                value: statData.value,
                max:   statData.displayMaximum || 0,
                noBar: statData.displayMaximum === 0,
                order: statOrder[statHash] ?? 999,
            });
        }
        stats.sort((a, b) => a.order - b.order);

        // ── Sockets (tous les plugs possibles via PlugSetDefinition) ──────
        const socketsRaw  = itemData.sockets?.data?.sockets || [];
        const reusable    = itemData.reusablePlugs?.data?.plugs || {};
        const socketEntries = itemDef?.sockets?.socketEntries || [];
        const sockets     = [];

        for (let i = 0; i < socketsRaw.length; i++) {
            const sock      = socketsRaw[i];
            const sockEntry = socketEntries[i] || {};
            if (!sock.plugHash || sock.isVisible === false) continue;

            const aDef = getDefinition('DestinyInventoryItemDefinition', String(sock.plugHash));
            if (!aDef) continue;
            const aCat = aDef.plug?.plugCategoryIdentifier || '';

            if (SOCK_SKIP.some(x => aCat.includes(x))) continue;
            if (!aCat) continue; // catégorie vide = masterwork tier ou slot vide
            // Bloquer les vrais mods d'énergie/ajustement, mais pas les perks/origins
            const MOD_BLOCK = /_(energy|adjusting|sights|tracker|mod_mag|mod_armor|mod_empty)/;
            if (/^v[0-9]+\.(weapon|armor|empty)\.mod/.test(aCat) && MOD_BLOCK.test(aCat)) continue;

            // Catégorie du socket
            let category;
            if (aCat.includes('intrinsic')) {
                category = 'intrinsic';
            } else if (aCat.includes('barrel') || aCat.includes('scope') ||
                       aCat.includes('bowstring') || aCat.includes('string') ||
                       aCat.includes('blade')     || aCat.includes('projectile')) {
                category = 'barrel';
            } else if (aCat.includes('magazine') || aCat.includes('arrow') ||
                       aCat.includes('battery')  || aCat.includes('guard') ||
                       aCat.includes('grip')) {
                category = 'magazine';
            } else {
                category = 'perk';
            }

            // 1. Plugs depuis le PlugSet (randomized ou reusable) → TOUS les rolls possibles
            const allHashes = new Set();
            const plugSetHash = sockEntry.randomizedPlugSetHash || sockEntry.reusablePlugSetHash;
            if (plugSetHash) {
                const plugSetDef = getDefinition('DestinyPlugSetDefinition', String(plugSetHash));
                for (const p of (plugSetDef?.reusablePlugItems || [])) {
                    allHashes.add(p.plugItemHash);
                }
            }
            // 2. Compléter avec les reusablePlug de l'instance et le plug actif
            for (const p of (reusable[i] || [])) allHashes.add(p.plugItemHash);
            allHashes.add(sock.plugHash);

            const plugsArr = [];
            const seenNames = new Set();
            for (const ph of allHashes) {
                const pd = getDefinition('DestinyInventoryItemDefinition', String(ph));
                if (!pd?.displayProperties?.name) continue;
                const pname = pd.displayProperties.name;
                if (seenNames.has(pname)) continue; // doublon de nom → ignorer
                const pcat = pd.plug?.plugCategoryIdentifier || '';
                if (!pcat) continue; // catégorie vide = masterwork tier
                if (SOCK_SKIP.some(x => pcat.includes(x))) continue;
                const MOD_BLOCK_P = /_(energy|adjusting|sights|tracker|mod_mag|mod_armor|mod_empty)/;
                if (/^v[0-9]+\.(weapon|armor|empty)\.mod/.test(pcat) && MOD_BLOCK_P.test(pcat)) continue;
                seenNames.add(pname);
                plugsArr.push({
                    hash:        ph,
                    name:        pname,
                    description: pd.displayProperties.description || '',
                    icon:        pd.displayProperties.icon
                                 ? `https://www.bungie.net${pd.displayProperties.icon}`
                                 : '',
                    isActive:    ph === sock.plugHash,
                });
            }

            if (!plugsArr.length) continue;
            // Plug actif en premier
            plugsArr.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
            sockets.push({ index: i, category, plugs: plugsArr });
        }

        res.json({
            stats,
            sockets,
            flavorText: itemDef?.flavorText      || '',
            source:     itemDef?.displaySource   || '',
            itemHash:   itemHash || null,
        });

    } catch (err) {
        console.error('Erreur item-detail:', err.response?.data || err.message);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée.' });
        res.status(500).json({ error: 'Erreur lors de la récupération des détails.' });
    }
});

// ── POST /api/me/transfer-item ────────────────────────────────────────────
router.post('/transfer-item', requireAuth, async (req, res) => {
    try {
        const { instanceId, itemHash, transferToVault, characterId } = req.body;
        if (!instanceId || !itemHash || typeof transferToVault !== 'boolean' || !characterId) {
            return res.status(400).json({ error: 'Paramètres manquants.' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.bungieMembershipId)
            return res.status(401).json({ error: 'Compte Bungie non lié.' });

        const accessToken = await ensureFreshToken(user);
        const headers = {
            'X-API-Key':     process.env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`,
        };

        let membership = membershipCache.get(req.user.userId);
        if (!membership) {
            const membRes = await axios.get(
                `https://www.bungie.net/Platform/User/GetMembershipsById/${user.bungieMembershipId}/254/`,
                { headers }
            );
            const m = membRes.data.Response.destinyMemberships[0];
            membership = { membershipType: m.membershipType, membershipId: m.membershipId };
            membershipCache.set(req.user.userId, membership);
        }
        const { membershipType } = membership;

        await axios.post(
            'https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/',
            {
                itemReferenceHash: itemHash,
                stackSize:         1,
                transferToVault,
                itemId:            instanceId,
                characterId,
                membershipType,
            },
            { headers }
        );

        res.json({ ok: true });

    } catch (err) {
        const bErr = err.response?.data?.Message || err.response?.data || err.message;
        console.error('Erreur transfer-item:', bErr);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée.' });
        // Erreur Bungie lisible (ex: "L'objet est verrouillé")
        const msg = err.response?.data?.Message || 'Erreur lors du transfert.';
        res.status(400).json({ error: msg });
    }
});

// ── POST /api/me/equip-item ───────────────────────────────────────────────
router.post('/equip-item', requireAuth, async (req, res) => {
    try {
        const { instanceId, characterId } = req.body;
        if (!instanceId || !characterId)
            return res.status(400).json({ error: 'Paramètres manquants.' });

        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.bungieMembershipId)
            return res.status(401).json({ error: 'Compte Bungie non lié.' });

        const accessToken = await ensureFreshToken(user);
        const headers = {
            'X-API-Key':     process.env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`,
        };

        let membership = membershipCache.get(req.user.userId);
        if (!membership) {
            const membRes = await axios.get(
                `https://www.bungie.net/Platform/User/GetMembershipsById/${user.bungieMembershipId}/254/`,
                { headers }
            );
            const m = membRes.data.Response.destinyMemberships[0];
            membership = { membershipType: m.membershipType, membershipId: m.membershipId };
            membershipCache.set(req.user.userId, membership);
        }
        const { membershipType } = membership;

        await axios.post(
            'https://www.bungie.net/Platform/Destiny2/Actions/Items/EquipItem/',
            { itemId: instanceId, characterId, membershipType },
            { headers }
        );

        res.json({ ok: true });

    } catch (err) {
        const msg = err.response?.data?.Message || 'Erreur lors de l\'équipement.';
        console.error('Erreur equip-item:', msg);
        if (err.response?.status === 401)
            return res.status(401).json({ error: 'Session Bungie expirée.' });
        res.status(400).json({ error: msg });
    }
});

module.exports = router;
