const CACHE='pnimit-v9.42';
const HTML_URLS=['pnimit-mega.html','manifest.json','shared/fsrs.js'];
const JSON_DATA_URLS=['data/questions.json','data/topics.json','data/notes.json','data/drugs.json','data/flashcards.json','data/tabs.json','harrison_chapters.json'];
const ALL_URLS=[...HTML_URLS,...JSON_DATA_URLS];

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ALL_URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

function shouldUseCacheFirst(url){
  return JSON_DATA_URLS.some(pattern=>url.endsWith(pattern));
}

// Fetch: navigate→HTML fallback, data→cache-first, assets→cache-first
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(!e.request.url.startsWith(self.location.origin))return;
  const url=new URL(e.request.url).pathname;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{
      if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
      return res;
    }).catch(()=>caches.match('pnimit-mega.html')));
  }else if(shouldUseCacheFirst(url)){
    e.respondWith(caches.match(e.request).then(r=>{
      const nf=fetch(e.request).then(res=>{
        if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
        return res;
      });
      return r||nf;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
      return res;
    })));
  }
});

// Background sync
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


// Skip waiting when update banner clicked
self.addEventListener('message',e=>{
if(e.data&&e.data.type==='SKIP_WAITING'){self.skipWaiting();}
});

// Push notification
self.addEventListener('message',e=>{
if(e.data&&e.data.type==='schedule-notification'){
const dueCount=e.data.dueCount||0;
if(dueCount>0&&self.registration.showNotification){
self.registration.showNotification('Pnimit Mega — Daily Review',{
body:`You have ${dueCount} question${dueCount>1?'s':''} due for spaced repetition review.`,
icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏥</text></svg>',
badge:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>',
tag:'daily-review',
renotify:true,
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
