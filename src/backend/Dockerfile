# Utiliser une image Node.js légère
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Exposer le port du serveur
EXPOSE 3000

# Appliquer les migrations puis démarrer
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]