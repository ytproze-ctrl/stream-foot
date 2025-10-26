import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, push, onValue, set, remove, serverTimestamp, onDisconnect
} from 'firebase/database';
import FIREBASE_CONFIG from './firebaseConfig';

// Initialisation Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);

const BAN_WORDS = ['putain', 'con', 'salope', 'nique', 'connard'];

function censorText(text) {
  let out = text;
  BAN_WORDS.forEach((w) => {
    const re = new RegExp(w, 'ig');
    out = out.replace(re, (m) => '*'.repeat(m.length));
  });
  return out;
}

function sanitizeNick(s) {
  return s.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().slice(0, 20) || 'Anonyme';
}

export default function App() {
  const [nick, setNick] = useState(localStorage.getItem('sf_nick') || 'Anonyme');
  const [isLogged, setIsLogged] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [moderators, setModerators] = useState({});
  const [myId, setMyId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const lastMessageRef = useRef(Number(localStorage.getItem('sf_last_msg') || 0));

  useEffect(() => {
    const id = 'u_' + Math.random().toString(36).slice(2, 9);
    setMyId(id);
    const pRef = ref(db, 'presence/' + id);
    set(pRef, { nick, ts: serverTimestamp() });
    onDisconnect(pRef).remove();

    const presRefRoot = ref(db, 'presence');
    onValue(presRefRoot, (snap) => {
      const val = snap.val() || {};
      setViewerCount(Object.keys(val).length);
    });

    return () => remove(ref(db, 'presence/' + id));
  }, []);

  useEffect(() => {
    const mRef = ref(db, 'messages');
    onValue(mRef, (snap) => {
      const v = snap.val() || {};
      const arr = Object.keys(v).map((k) => ({ id: k, ...v[k] }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      setMessages(arr);
      const box = document.getElementById('chat-box');
      if (box) box.scrollTop = box.scrollHeight;
    });

    const modRef = ref(db, 'moderators');
    onValue(modRef, (snap) => setModerators(snap.val() || {}));
  }, []);

  function login() {
    const s = sanitizeNick(nick);
    setNick(s);
    localStorage.setItem('sf_nick', s);
    set(ref(db, 'presence/' + myId), { nick: s, ts: serverTimestamp() });
    setIsLogged(true);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const now = Date.now();
    if (now - lastMessageRef.current < 10000) {
      alert('Veuillez attendre 10 secondes entre chaque message.');
      return;
    }
    if (!text.trim()) return;
    const cens = censorText(text.trim());
    await push(ref(db, 'messages'), { nick, text: cens, ts: Date.now() });
    lastMessageRef.current = Date.now();
    localStorage.setItem('sf_last_msg', String(lastMessageRef.current));
    setText('');
  }

  async function deleteMessage(id) {
    if (!confirm('Supprimer ce message ?')) return;
    await remove(ref(db, 'messages/' + id));
  }

  const videoSrc = 'https://www.w3schools.com/html/mov_bbb.mp4';

  return (
    <div className="app-root">
      <header className="header">
        <div className="container">
          <div className="logo">Stream Foot</div>
          <div className="view-count">Spectateurs: <strong>{viewerCount}</strong></div>
        </div>
      </header>

      <main className="container main-grid">
        <section className="video-area">
          <div className={"video-box " + (expanded ? 'expanded' : '')}>
            <video id="main-video" controls src={videoSrc} />
            <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Réduire' : 'Agrandir'}
            </button>
          </div>
          <div className="note">Flux unique — agrandissez la vidéo pour la mettre en avant</div>
        </section>

        <aside className="chat-area">
          <div className="chat-box">
            <div className="chat-header">
              <div className="title">Chat</div>
              <div className="mods">Modos: {Object.keys(moderators).length}</div>
            </div>

            <div id="chat-box" className="messages">
              {messages.map((m) => (
                <div key={m.id} className="message">
                  <div className="m-head">
                    <div className="m-nick">{m.nick}</div>
                    <div className="m-time">{new Date(m.ts || 0).toLocaleTimeString()}</div>
                  </div>
                  <div className="m-text">{m.text}</div>
                  {moderators[myId] && (
                    <div className="m-actions">
                      <button onClick={() => deleteMessage(m.id)}>Supprimer</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form className="chat-input" onSubmit={sendMessage}>
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder={isLogged ? 'Écrire un message...' : 'Entrez un pseudo pour discuter'}
                disabled={!isLogged} />
              <button type="submit" disabled={!isLogged}>Envoyer</button>
            </form>

            {!isLogged && (
              <div className="login-row">
                <input value={nick} onChange={(e) => setNick(e.target.value)} />
                <button onClick={login}>Entrer</button>
              </div>
            )}

            <div className="dev-note">Astuce dev: gérer les mods via la console Firebase (clé: moderators)</div>
          </div>

          <div className="rules">
            <div className="rules-title">Règlement du chat</div>
            <ol>
              <li>Pas d'insultes (les mots seront remplacés par des *)</li>
              <li>Pas de spam — 10s entre chaque message</li>
              <li>Respectez les autres utilisateurs</li>
              <li>Les modérateurs peuvent supprimer des messages ou exclure</li>
            </ol>
            <div className="contact">Contact: admin (configurable dans Firebase)</div>
          </div>
        </aside>
      </main>

      <footer className="footer">Stream Foot - Tout le football online</footer>
    </div>
  );
}
