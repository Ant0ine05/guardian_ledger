const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// On utilise le chemin défini dans ton .env
const dbPath = path.resolve(__dirname, '../data/manifest.db');
const db = new Database(dbPath, { verbose: console.log });

const getDefinition = (tableName, hash) => {
    try {
        // Conversion du hash pour SQLite (32-bit signed integer)
        const id = hash >> 0;
        const stmt = db.prepare(`SELECT json FROM ${tableName} WHERE id = ?`);
        const row = stmt.get(id);
        return row ? JSON.parse(row.json) : null;
    } catch (error) {
        console.error("Erreur SQL:", error);
        return null;
    }
};

module.exports = { getDefinition };