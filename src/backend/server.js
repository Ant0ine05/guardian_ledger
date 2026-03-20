const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Import de tes fichiers
const authRoutes = require('./routes/routerAuth');
const dataRoutes = require('./routes/routerData');

// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur Guardian Ledger sur port ${PORT}`);
});