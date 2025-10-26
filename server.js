// server.js
// Node 18+ recommandé
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(express.json());

// CONFIG
const PORT = process.env.PORT || 3000;
const SECRET = process.env.STREAM_SECRET || 'change_this_secret_super_long';
const TOKEN_TTL_MS = 60 * 1000; // token valide 60s
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// Map des flux : id -> vraie URL (remplace par tes URLs réelles)
const STREAMS = {
  // Ex : 'main' : 'https://origin.example.com/files/myvideo.mp4'
  main: 'https://www.w3schools.com/html/mov_bbb.mp4'
};

// Rate limiter (prévenir abus sur génération token)
const limiter = rateLimit({
  windowMs: 60*1000,
  max: 20,
  message: 'Too many requests, slow down'
});
app.use('/token', limiter);

// Helper: génère token HMAC
function generateToken(path, expires) {
  const h = crypto.createHmac('sha256', SECRET).update(path + '|' + expires).digest('hex');
  return h;
}

// Vérifie token
function verifyToken(token, path, expires) {
  if (!token || !expires) return false;
  if (Date.now() > Number(expires)) return false;
  const expected = generateToken(path, expires);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

// Endpoint pour créer un token (appelé par le client pour obtenir une URL signée)
// On vérifie l'origin pour limiter qui peut demander des tokens.
app.get('/token', (req, res) => {
  const id = req.query.id;
  if (!id || !STREAMS[id]) return res.status(404).json({error: 'Stream not found'});
  const origin = req.get('origin') || req.get('referer') || '';
  if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    // Si tu veux autoriser sans origin, retire cette vérif
    return res.status(403).json({error: 'Origin not allowed', origin});
  }

  const path = `/stream/${id}`;
  const expires = Date.now() + TOKEN_TTL_MS;
  const token = generateToken(path, expires);
  // url que le client utilisera — note : token + exp sont valides très peu de temps
  const url = `${path}?token=${token}&exp=${expires}`;
  res.json({url, ttl_ms: TOKEN_TTL_MS});
});

// Endpoint proxy : vérifie token puis proxy la ressource distante
app.get('/stream/:id', async (req, res) => {
  const id = req.params.id;
  if (!STREAMS[id]) return res.status(404).send('Not found');
  const token = req.query.token;
  const exp = req.query.exp;
  const path = `/stream/${id}`;

  if (!verifyToken(token, path, exp)) {
    return res.status(403).send('Invalid or expired token');
  }

  const realUrl = STREAMS[id];

  try {
    // Supporte les requêtes range (seek)
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;

    const response = await axios.get(realUrl, {
      responseType: 'stream',
      headers,
      validateStatus: s => s >= 200 && s < 400
    });

    // Forward important headers
    const ct = response.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);

    const cl = response.headers['content-length'];
    if (cl) res.setHeader('Content-Length', cl);

    const cr = response.status;
    if (cr === 206) {
      // Partial content (range)
      res.status(206);
      const contentRange = response.headers['content-range'];
      if (contentRange) res.setHeader('Content-Range', contentRange);
    } else {
      res.status(200);
    }

    // Pipe le stream
    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy error', err.message || err);
    res.status(502).send('Bad gateway');
  }
});

// Optional: endpoint pour afficher status / config minimale
app.get('/_status', (req, res) => {
  res.json({ok: true, streams: Object.keys(STREAMS)});
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(',')}`);
});
