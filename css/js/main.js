// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "VOTRE_APIKEY",
  authDomain: "VOTRE_AUTHDOMAIN",
  databaseURL: "VOTRE_DATABASE_URL",
  projectId: "VOTRE_PROJECTID",
  storageBucket: "VOTRE_STORAGEBUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APPID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ---------- UTIL ----------
const BAN_WORDS=['putain','con','salope','nique','connard'];
function censor(text){let out=text;BAN_WORDS.forEach(w=>{const re=new RegExp(w,'ig');out=out.replace(re,m=>'*'.repeat(m.length));});return out;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));}

// ---------- DISCORD LOGIN ----------
const discordLoginBtn = document.getElementById('discordLoginBtn');
discordLoginBtn.addEventListener('click', ()=>{
  const clientId = 'VOTRE_CLIENT_ID';
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const scope = encodeURIComponent('identify');
  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
});

function getDiscordToken(){
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

async function fetchDiscordUser(token){
  const res = await fetch('https://discord.com/api/users/@me',{ headers:{Authorization:'Bearer '+token}});
  return res.json();
}

// ---------- INIT SITE AFTER LOGIN ----------
(async ()=>{
  const token = getDiscordToken();
  if(!token) return; // rester sur login si pas connecté
  const user = await fetchDiscordUser(token);

  // Masquer login
  document.getElementById('loginContainer').style.display='none';

  // Injecter HTML du site
  const siteContainer = document.getElementById('siteContainer');
  siteContainer.innerHTML = `
  <div class="site">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="logo" style="font-weight:800;color:#fff;font-size:20px">Stream Foot - Simple</div>
      <div class="viewer small" style="opacity:0.9">Spectateurs: <span id="viewerCount">0</span></div>
    </header>

    <div class="layout" style="display:flex;gap:12px">
      <div class="video-col" style="flex:1">
        <div class="panel" style="background:#0b0f14;border:2px solid #c62828;padding:10px;border-radius:8px">
          <div class="video-box" id="videoBox" style="position:relative;height:420px;border-radius:6px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center">
            <video id="player" controls playsinline preload="metadata" src="https://www.w3schools.com/html/mov_bbb.mp4" style="width:100%;height:100%;object-fit:contain;background:#000"></video>
            <button id="expandBtn" style="position:absolute;top:10px;right:10px;background:#c62828;border:none;padding:8px 10px;border-radius:6px;color:#fff;cursor:pointer;z-index:10">Agrandir</button>
          </div>
          <div class="note" style="margin-top:8px;background:#c62828;padding:8px;border-radius:6px;text-align:center;font-weight:700">Flux unique — agrandissez la vidéo</div>
        </div>
      </div>

      <div class="chat-col" style="width:320px;display:flex;flex-direction:column;gap:10px">
        <div class="panel" style="display:flex;flex-direction:column;gap:8px;background:#0b0f14;border-radius:8px;padding:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Chat</strong>
            <span class="small">Modos: <span id="modCount">0</span></span>
          </div>
          <div id="messages" style="height:360px;overflow:auto;background:#051018;padding:8px;border-radius:6px"></div>
          <form id="chatForm" style="display:flex;gap:8px" onsubmit="return false;">
            <input id="nick" type="text" value="${user.username}" placeholder="Pseudo" style="flex:1;padding:8px;border-radius:6px;border:none"/>
            <input id="msg" type="text" placeholder="Message..." style="flex:2;padding:8px;border-radius:6px;border:none"/>
            <button id="sendBtn" style="background:#c62828;border:none;padding:8px 10px;border-radius:6px;color:#fff;cursor:pointer">Envoyer</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  `;

  // ---------- CHAT + PRESENCE ----------
  const uid='u_'+Math.random().toString(36).slice(2,9);
  const presenceRef=db.ref('presence/'+uid);
  const nickInput = document.getElementById('nick');
  const msgInput = document.getElementById('msg');
  const sendBtn = document.getElementById('sendBtn');
  const messagesEl = document.getElementById('messages');
  const viewerCountEl = document.getElementById('viewerCount');
  const modCountEl = document.getElementById('modCount');

  presenceRef.set({nick:user.username,ts:Date.now()});
  presenceRef.onDisconnect().remove();

  db.ref('presence').on('value', snap=>{
    const v = snap.val()||{};
    viewerCountEl.textContent = Object.keys(v).length;
  });

  db.ref('messages').limitToLast(200).on('value', snap=>{
    const v = snap.val()||{};
    messagesEl.innerHTML='';
    Object.keys(v).sort((a,b)=>(v[a].ts||0)-(v[b].ts||0)).forEach(key=>{
      const m=v[key];
      const div=document.createElement('div');
      div.className='msg';
      div.innerHTML='<div class="nick">'+escapeHtml(m.nick||'Anonyme')+'</div><div class="text">'+escapeHtml(m.text||'')+'</div>';
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  let lastMsgTs = Number(localStorage.getItem('sf_last_msg')||0);
  sendBtn.addEventListener('click', async ()=>{
    const now = Date.now();
    if(now-lastMsgTs<10000){alert('Veuillez attendre 10 secondes'); return;}
    const nick = nickInput.value.trim()||'Anonyme';
    const text = msgInput.value.trim();
    if(!text) return;
    const cens = censor(text);
    await db.ref('messages').push({nick,text:cens,ts:Date.now()});
    lastMsgTs = Date.now();
    localStorage.setItem('sf_last_msg',String(lastMsgTs));
    msgInput.value='';
  });

  // ---------- VIDEO EXPAND ----------
  const expandBtn = document.getElementById('expandBtn');
  const player = document.getElementById('player');
  expandBtn.addEventListener('click', async ()=>{
    const box=document.getElementById('videoBox');
    if(!document.fullscreenElement){
      if(box.requestFullscreen) await box.requestFullscreen();
      expandBtn.textContent='Réduire';
    } else {
      if(document.exitFullscreen) await document.exitFullscreen();
      expandBtn.textContent='Agrandir';
    }
  });

})();
