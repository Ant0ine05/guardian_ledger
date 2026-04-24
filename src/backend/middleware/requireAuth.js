const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'guardian-ledger-dev-secret-changeme';

module.exports = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return res.status(401).json({ error: 'Non autorisé.' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
};
