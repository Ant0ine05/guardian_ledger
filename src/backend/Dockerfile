# Utiliser une image Node.js légère
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port du serveur
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]