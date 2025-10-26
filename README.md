    Stream Foot - Pack prêt à déployer
    ==================================

    Contenu :
    - index.html (site complet, chat à gauche, vidéo à droite)
    - README avec instructions

    Instructions rapides :
    1) Créez un projet Firebase (console.firebase.google.com) et activez Realtime Database.
    2) Dans Project settings -> SDK Web, copiez la config et remplacez la section `firebaseConfig`
       dans le fichier `index.html` par vos valeurs.
    3) Dans Realtime Database -> Règles, pour TEST uniquement (puis durcir) :
       {
  "rules": {
    ".read": true,
    ".write": true
  }
}
    4) Hébergez le fichier `index.html` (GitHub Pages, Netlify, ou autre).

    Notes :
    - Le champ "Source vidéo" permet de changer la source sans recharger la page.
    - La censure est basique et configurable dans le tableau BAN_WORDS dans le code.
    - Pour supprimer un message ou donner des droits de modération, utilisez la console Firebase :
      créez un noeud `moderators` et ajoutez une clé (ex: `moderators/mod1: true`). Le nombre de modos
      s'affichera automatiquement.
    - Pour une sécurité réelle en production, ajoutez Firebase Auth et des règles strictes côté DB.
