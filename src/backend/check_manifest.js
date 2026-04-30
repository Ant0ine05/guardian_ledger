const Database = require('better-sqlite3');
const db = new Database('./data/manifest.db');

// Capacité réelle du vault
const VAULT_BUCKET_HASH = 138197802;
const id = VAULT_BUCKET_HASH >> 0;
const row = db.prepare('SELECT json FROM DestinyInventoryBucketDefinition WHERE id = ?').get(id);
if (row) {
  const def = JSON.parse(row.json);
  console.log('Vault bucket def:', JSON.stringify(def, null, 2));
} else {
  console.log('Bucket vault introuvable');
}
db.close();
