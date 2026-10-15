// Borgo Fight: il gioco funziona anche senza internet (la partita sullo stesso dispositivo).
// Prima prova a scaricare la versione nuova; la copia salvata si usa solo senza connessione.
const CACHE='borgofight-v2';
const FILES=['./','./index.html','./config.js','./firebase-adapter.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET' || u.origin!==location.origin) return;   // Firebase resta sempre sulla rete
  e.respondWith(fetch(e.request).then(res=>{ if(res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); } return res; })
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
