#!/usr/bin/env bash
set -euo pipefail

echo "=== Pnimit Mega — Production Build ==="

# 1. Run Vite build (bundles JS/CSS, processes HTML)
echo "→ Vite build..."
npx vite build

# 2. Copy static assets that Vite doesn't process
echo "→ Copying static assets..."
cp -r data/ dist/data/
cp harrison_chapters.json dist/
cp -r shared/ dist/shared/
cp -r exams/ dist/exams/
cp -r articles/ dist/articles/
cp -r harrison/ dist/harrison/
cp -r questions/ dist/questions/
cp -r syllabus/ dist/syllabus/
cp manifest.json dist/manifest.json
cp index.html dist/index.html

# 3. Fix manifest.json path in built HTML
# Vite hashes it to assets/manifest-HASH.json — revert to plain manifest.json
echo "→ Fixing manifest path in built HTML..."
sed -i 's|href="[^"]*manifest[^"]*\.json"|href="manifest.json"|' dist/pnimit-mega.html

# 4. Generate production service worker
# In production, JS/CSS are content-hashed (immutable) — browser cache handles them.
# SW only needs to cache: HTML shell (offline access) + data JSON (offline quiz).
echo "→ Generating production service worker..."
cat > dist/sw.js << 'SWEOF'
const CACHE='pnimit-v9.43';
const SHELL_URLS=['pnimit-mega.html','manifest.json','shared/fsrs.js'];
const DATA_URLS=['data/questions.json','data/topics.json','data/notes.json','data/drugs.json','data/flashcards.json','data/tabs.json','harrison_chapters.json'];
const ALL_URLS=[...SHELL_URLS,...DATA_URLS];

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ALL_URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(!e.request.url.startsWith(self.location.origin))return;
  const url=new URL(e.request.url).pathname;
  // Navigate → network-first with HTML fallback
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{
      if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
      return res;
    }).catch(()=>caches.match('pnimit-mega.html')));
  }
  // Data JSON → stale-while-revalidate
  else if(DATA_URLS.some(d=>url.endsWith(d))){
    e.respondWith(caches.match(e.request).then(r=>{
      const nf=fetch(e.request).then(res=>{
        if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
        return res;
      });
      return r||nf;
    }).catch(()=>caches.match(e.request)));
  }
  // Hashed assets (JS/CSS) → cache-first (immutable by content hash)
  else if(url.includes('/assets/')){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
      return res;
    })));
  }
  // Everything else → network-first
  else{
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }
});

// Background sync for Supabase backup
self.addEventListener('sync',e=>{
if(e.tag==='supabase-backup'){
e.waitUntil(
(async()=>{
try{
const db=await new Promise((resolve,reject)=>{
const req=indexedDB.open('pnimit_mega_db',1);
req.onsuccess=ev=>resolve(ev.target.result);
req.onerror=ev=>reject(ev.target.error);
});
const tx=db.transaction('state','readonly');
const req=tx.objectStore('state').get('pending_sync');
const data=await new Promise(r=>{req.onsuccess=()=>r(req.result);req.onerror=()=>r(null);});
if(data&&data.url&&data.body){
const res=await fetch(data.url,{method:'POST',headers:{'Content-Type':'application/json','apikey':data.apikey||''},body:JSON.stringify(data.body)});
if(res.ok){
const clearTx=db.transaction('state','readwrite');
clearTx.objectStore('state').delete('pending_sync');
}
}
}catch(err){console.warn('Background sync failed:',err);}
})()
);
}
});

self.addEventListener('message',e=>{
if(e.data&&e.data.type==='SKIP_WAITING'){self.skipWaiting();}
if(e.data&&e.data.type==='schedule-notification'){
const dueCount=e.data.dueCount||0;
if(dueCount>0&&self.registration.showNotification){
self.registration.showNotification('Pnimit Mega — Daily Review',{
body:'You have '+dueCount+' question'+(dueCount>1?'s':'')+' due for spaced repetition review.',
tag:'daily-review',renotify:true,
data:{url:self.registration.scope+'pnimit-mega.html'}
});
}
}
});

self.addEventListener('notificationclick',e=>{
e.notification.close();
e.waitUntil(
clients.matchAll({type:'window'}).then(cls=>{
for(const c of cls){if(c.url.includes('pnimit-mega')&&'focus' in c)return c.focus();}
if(clients.openWindow)return clients.openWindow(e.notification.data?.url||'pnimit-mega.html');
})
);
});
SWEOF

# 5. Summary
echo ""
echo "=== Build complete ==="
echo "Output: dist/"
du -sh dist/
echo ""
echo "Key files:"
ls -lh dist/pnimit-mega.html dist/sw.js dist/manifest.json dist/assets/*.js dist/assets/*.css 2>/dev/null
echo ""
echo "Static assets:"
du -sh dist/data/ dist/harrison_chapters.json dist/shared/ dist/exams/ dist/articles/ dist/harrison/ dist/questions/ dist/syllabus/ 2>/dev/null
