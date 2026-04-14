import G from './globals.js';
import { LS } from './constants.js';
import { safeJSONParse } from './utils.js';

// State & storage — extracted from pnimit-mega.html
// Depends on: LS (constants.js), safeJSONParse (utils.js)

G.S=safeJSONParse(LS,{ck:{},qOk:0,qNo:0,bk:{},notes:{},sr:{},fci:0,fcFlip:false,streak:0,lastDay:null,chat:[],studyMode:false,sp:{},spOpen:true});
if(!G.S.chat)G.S.chat=[];
if(G.S.studyMode===undefined)G.S.studyMode=false;
if(!G.S.streak)G.S.streak=0;if(!G.S.lastDay)G.S.lastDay=null;
if(!G.S.sp)G.S.sp={};
if(G.S.spOpen===undefined)G.S.spOpen=true;
G.save=function G.save(){clearTimeout(G._saveTimer);G._saveTimer=setTimeout(()=>{
  localStorage.setItem(LS,JSON.stringify(G.S));
  // Warn if localStorage approaching 5MB limit
  try{
    let total=0;
    for(let k in localStorage)if(localStorage.hasOwnProperty(k))total+=localStorage[k].length*2;
    if(total>4*1024*1024&&!window._lsWarnShown){
      window._lsWarnShown=true;
      console.warn('localStorage: '+(total/1024/1024).toFixed(1)+'MB — approaching limit');
      localStorage.removeItem('pnimit_ex');
      localStorage.removeItem('pnimit_weekly');
    }
  }catch(e){}
  },150)}
(function updateStreak(){
const today=new Date().toISOString().slice(0,10);
if(G.S.lastDay===today)return;
const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
if(G.S.lastDay===yest)G.S.streak++;
else if(G.S.lastDay!==today)G.S.streak=1;
G.S.lastDay=today;G.save();
})();

// ===== INDEXEDDB MIGRATION =====
const IDB_NAME='pnimit_mega_db',IDB_VER=1,IDB_STORE='state';
let G.idb=null;
export function openIDB(){return new Promise((resolve,reject)=>{
const req=indexedDB.open(IDB_NAME,IDB_VER);
req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);};
req.onsuccess=e=>{G.idb=e.target.result;resolve(G.idb);};
req.onerror=e=>reject(e.target.error);
});}
export function idbGet(key){return new Promise((resolve,reject)=>{
if(!G.idb)return resolve(null);
const tx=G.idb.transaction(IDB_STORE,'readonly');
const req=tx.objectStore(IDB_STORE).get(key);
req.onsuccess=()=>resolve(req.result||null);
req.onerror=()=>resolve(null);
});}
export function idbSet(key,val){return new Promise((resolve,reject)=>{
if(!G.idb)return resolve();
const tx=G.idb.transaction(IDB_STORE,'readwrite');
tx.objectStore(IDB_STORE).put(val,key);
tx.oncomplete=()=>resolve();
tx.onerror=()=>resolve();
});}
// Migrate localStorage → IndexedDB on first run
export async function migrateToIDB(){
if(typeof _dataPromise!=='undefined') await _dataPromise; else await new Promise(r=>{const iv=setInterval(()=>{if(typeof QZ!=='undefined'&&QZ.length){clearInterval(iv);r();}},50);setTimeout(()=>{clearInterval(iv);r();},5000);});

try{
await openIDB();
const existing=await idbGet('pnimit_mega');
if(!existing){
const lsData=localStorage.getItem(LS);
if(lsData){
await idbSet('pnimit_mega',JSON.parse(lsData));
// Keep user_id for Supabase, clear the rest
const uid=null/*user_id removed*/;
localStorage.removeItem(LS);
// user_id removed — no longer needed
}else{
await idbSet('pnimit_mega',G.S);
}
}else{
// Load from IDB into state
Object.assign(G.S,existing);
}
// Override G.save() to use IDB
const origSave=G.save;
window._idbSaveTimer=null;
const idbSave=()=>{clearTimeout(window._idbSaveTimer);window._idbSaveTimer=setTimeout(()=>{
idbSet('pnimit_mega',JSON.parse(JSON.stringify(G.S))).catch(()=>{});
// Keep localStorage as fallback
try{localStorage.setItem(LS,JSON.stringify(G.S));}catch(e){}
},150);};
// Replace the global G.save
window.save=idbSave;
G.save=idbSave;
}catch(e){console.warn('IDB migration failed, using localStorage:',e);}
}
