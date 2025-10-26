# Stream Foot - Projet React (FR)

Contenu:
- Interface de lecteur vidéo avec bouton Agrandir
- Chat en temps réel via Firebase Realtime Database
- Censure de mots (remplacés par étoiles)
- Latence client: 10s entre messages
- Présence (compteur de spectateurs)
- Règlement affiché
- Possibilité de modérateurs (via `moderators` dans la DB)

⚠️ Avant de lancer:
1. Remplacez la configuration Firebase dans `src/firebaseConfig.js`.
2. Créez un projet Firebase et activez Realtime Database.
3. Pour tests seulement, vous pouvez ouvrir temporairement les règles de la DB.
4. Installez les dépendances: `npm install`
5. Lancez en local: `npm start`

Pour améliorer la sécurité en production:
- Utiliser Firebase Auth
- Restreindre les règles Realtime Database
- Gérer les grants de modération côté serveur (Cloud Functions)
