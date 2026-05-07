/**
 * Script de vérification : affiche tous les perks disponibles
 * par slot socket pour une arme donnée (via son itemHash dans le manifest).
 *
 * Usage : node check_perks.js <itemHash>
 * Exemple : node check_perks.js 2907129557
 */
const Database = require('better-sqlite3');
const db = new Database('./data/manifest.db');

const itemHash = process.argv[2];
if (!itemHash) {
    console.error('Usage: node check_perks.js <itemHash>');
    process.exit(1);
}

function getRow(table, hash) {
    const id = hash >> 0;
    const row = db.prepare(`SELECT json FROM ${table} WHERE id = ?`).get(id);
    return row ? JSON.parse(row.json) : null;
}

const itemDef = getRow('DestinyInventoryItemDefinition', parseInt(itemHash));
if (!itemDef) {
    console.error('Item introuvable dans le manifest pour hash:', itemHash);
    process.exit(1);
}

console.log('\n=== ITEM ===');
console.log('Nom :', itemDef.displayProperties?.name);
console.log('Type :', itemDef.itemTypeDisplayName);

const socketEntries = itemDef.sockets?.socketEntries || [];
console.log(`\nNombre de sockets : ${socketEntries.length}`);

const SOCK_SKIP = ['shader', 'ornament', 'masterwork', 'empty', 'mod_armor_energy',
    'holographic', 'aspect', 'fragment', 'abilities', 'stasis',
    'void.ability', 'arc.ability', 'solar.ability'];

socketEntries.forEach((entry, i) => {
    const plugSetHash = entry.randomizedPlugSetHash || entry.reusablePlugSetHash;
    if (!plugSetHash) return;

    const plugSetDef = getRow('DestinyPlugSetDefinition', plugSetHash);
    if (!plugSetDef?.reusablePlugItems?.length) return;

    const plugs = [];
    for (const p of plugSetDef.reusablePlugItems) {
        const pd = getRow('DestinyInventoryItemDefinition', p.plugItemHash);
        if (!pd?.displayProperties?.name) continue;
        const pcat = pd.plug?.plugCategoryIdentifier || '';
        if (SOCK_SKIP.some(x => pcat.includes(x))) continue;
        if (pcat.startsWith('v400.weapon.mod') || pcat.startsWith('v400.empty') || pcat.startsWith('v400.armor.mod')) continue;
        plugs.push({
            hash: p.plugItemHash,
            name: pd.displayProperties.name,
            cat: pcat,
        });
    }

    if (!plugs.length) return;

    console.log(`\n--- Socket [${i}] (${entry.randomizedPlugSetHash ? 'randomisé' : 'fixe'}, plugSetHash=${plugSetHash}) ---`);
    plugs.forEach(p => console.log(`  [${p.hash}] ${p.name}  (${p.cat})`));
});

db.close();
