// Service worker: l'app funziona anche senza rete (o con poca rete) dopo il primo uso.
// - Codice e dati (pagina, version.json, CSS, JS, JSON): prima la rete, così gli aggiornamenti arrivano subito; senza
//   rete la copia salvata. I CSS e il JS hanno ?v=N: senza rete e senza quella versione si prende l'ultima salvata.
// - Immagini e font: prima la copia salvata (non cambiano), altrimenti la rete, e si salvano.
// Le immagini delle carte del mazzo si scaricano all'inizio della partita (script.js, prefetchDeckImages).
const CODE_CACHE = 'ae-code-v1';
const MEDIA_CACHE = 'ae-media-v1';
const SHELL = ['./', 'index.html', 'version.json', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CODE_CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CODE_CACHE && k !== MEDIA_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function isMedia(url) {
  return /\.(webp|png|jpe?g|svg|woff2?|ttf)$/i.test(url.pathname) || url.hostname === 'fonts.gstatic.com';
}

async function mediaFirst(req) {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

// Del nostro sito si salva una copia sola per file, senza ?v=N / ?t=…: senza rete si ha l'ultima versione scaricata
function codeKey(req) {
  const url = new URL(req.url);
  return url.origin === self.location.origin ? url.origin + url.pathname : req;
}

async function networkFirst(req) {
  const cache = await caches.open(CODE_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(codeKey(req), res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(codeKey(req));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && url.hostname !== 'fonts.googleapis.com' && url.hostname !== 'fonts.gstatic.com') return;
  e.respondWith(isMedia(url) ? mediaFirst(req) : networkFirst(req));
});
