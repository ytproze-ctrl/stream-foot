// Connexion Socket.IO
const socket = io();

// DOM Elements
const messages = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const sendButton = form.querySelector('button');
const viewerCount = document.getElementById('viewer-count');

// Fonction pour envoyer un message
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit('chat message', msg);
  input.value = '';
  input.focus();
}

// Envoyer message au clic du bouton
sendButton.addEventListener('click', e => {
  e.preventDefault();
  sendMessage();
});

// Envoyer message avec la touche Entrée
form.addEventListener('submit', e => {
  e.preventDefault();
  sendMessage();
});

// Réception des messages du serveur
socket.on('chat message', msg => {
  const li = document.createElement('li');
  li.textContent = msg;

  // Rendre le message cliquable
  li.style.cursor = 'pointer';
  li.addEventListener('click', () => alert(`Message cliqué : ${msg}`));

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Compteur de viewers en temps réel
socket.on('viewers', count => {
  viewerCount.textContent = `Viewers: ${count}`;
});

// Vérification de la connexion Discord
fetch('/user')
  .then(res => {
    if (res.ok) {
      document.getElementById('login-btn').style.display = 'none';
      document.getElementById('logout-btn').style.display = 'inline';
    }
  })
  .catch(() => {});
