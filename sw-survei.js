// Service worker halaman survei: jaringan dulu, cadangan dari simpanan bila tanpa sinyal. Hanya menyimpan survei.html (tanpa data).
const C='survei-v1',HAL=['survei.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(HAL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||!/\/survei\.html$/.test(u.pathname))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const k=r.clone();caches.open(C).then(c=>c.put('survei.html',k));}return r;}).catch(()=>caches.match('survei.html')));
});
