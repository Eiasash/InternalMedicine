// App orchestrator — extracted from pnimit-mega.html
// render(), renderTabs, go, theme toggles, share, help, SW boot

let tab='quiz';
let learnSub='study';
let moreSub='calc';
let libSec='harrison';
let harChOpen=null,_harData=null,_harLoading=false;
function renderTabs(){
document.getElementById('tb').innerHTML=TABS.map(t=>
`<button class="${t.id===tab?'on':''}" onclick="go('${t.id}')" aria-label="${t.l}"><span class="ic">${t.ic}</span>${t.l}</button>`
).join('');
}
function go(t){tab=t;renderTabs();render()}


function render(){
const el=document.getElementById('ct');
const focused=document.activeElement?.id;
const sv={srchi:document.getElementById('srchi')?.value,nfilt:document.getElementById('nfilt')?.value,dsrch:document.getElementById('dsrch')?.value};
if(tab!==lastTab){el.classList.remove('fade-in');void el.offsetWidth;el.classList.add('fade-in');window.scrollTo({top:0});lastTab=tab;}
switch(tab){
case'quiz':el.innerHTML=onCallMode?renderOnCall():renderQuiz();break;
case'learn':
  {const _subBar='<div style="display:flex;gap:4px;margin-bottom:12px;padding:4px;background:#f1f5f9;border-radius:12px">'+
  [{id:'study',ic:'📚',l:'Study'},{id:'flash',ic:'🃏',l:'Cards'},{id:'drugs',ic:'💊',l:'Drugs'}].map(s=>
    '<button onclick="learnSub=\''+s.id+'\';render()" style="flex:1;padding:8px 4px;border:none;border-radius:10px;font-size:11px;font-weight:'+(learnSub===s.id?'700':'400')+';cursor:pointer;background:'+(learnSub===s.id?'#fff':'transparent')+';color:'+(learnSub===s.id?'#0f172a':'#64748b')+';box-shadow:'+(learnSub===s.id?'0 1px 3px rgba(0,0,0,.1)':'none')+'">'+s.ic+' '+s.l+'</button>'
  ).join('')+'</div>';
  let _body='';
  if(learnSub==='study')_body=renderStudy();
  else if(learnSub==='flash')_body=renderFlash();
  else if(learnSub==='drugs')_body=renderDrugs();
  el.innerHTML=_subBar+_body;}break;
case'study':tab='learn';learnSub='study';el.innerHTML='';render();break;
case'flash':tab='learn';learnSub='flash';el.innerHTML='';render();break;
case'drugs':tab='learn';learnSub='drugs';el.innerHTML='';render();break;
case'lib':el.innerHTML=renderLibrary();break;
case'articles':libSec='articles';tab='lib';el.innerHTML=renderLibrary();break;
case'track':
  if(!_sessionSaved&&(_sessionOk+_sessionNo)>=5){
    saveSessionSummary();_sessionSaved=true;
  }
  el.innerHTML=renderTrack();break;
case'more':
  {const _moreBar='<div style="display:flex;gap:4px;margin-bottom:12px;padding:4px;background:#f1f5f9;border-radius:12px">'+
  [{id:'calc',ic:'🧮',l:'Calc'},{id:'search',ic:'🔍',l:'Search'},{id:'chat',ic:'💬',l:'Chat'},{id:'feedback',ic:'💡',l:'Feedback'}].map(s=>
    '<button onclick="moreSub=\''+s.id+'\';render()" style="flex:1;padding:8px 4px;border:none;border-radius:10px;font-size:11px;font-weight:'+(moreSub===s.id?'700':'400')+';cursor:pointer;background:'+(moreSub===s.id?'#fff':'transparent')+';color:'+(moreSub===s.id?'#0f172a':'#64748b')+';box-shadow:'+(moreSub===s.id?'0 1px 3px rgba(0,0,0,.1)':'none')+'">'+s.ic+' '+s.l+'</button>'
  ).join('')+'</div>';
  let _mBody='';
  if(moreSub==='calc')_mBody=renderCalc();
  else if(moreSub==='search')_mBody=renderSearch();
  else if(moreSub==='chat')_mBody=renderChat();
  else if(moreSub==='feedback')_mBody=renderFeedback();
  el.innerHTML=_moreBar+_mBody;}break;
case'calc':tab='more';moreSub='calc';el.innerHTML='';render();break;
case'search':tab='more';moreSub='search';el.innerHTML='';render();break;
case'chat':tab='more';moreSub='chat';el.innerHTML='';render();break;
case'book':case'syl':tab='lib';el.innerHTML=renderLibrary();break;
default:tab='quiz';el.innerHTML=renderQuiz();break;
}
// Ward modal

// Restore input values and focus
if(sv.srchi!==undefined&&document.getElementById('srchi'))document.getElementById('srchi').value=sv.srchi;
if(sv.nfilt!==undefined&&document.getElementById('nfilt'))document.getElementById('nfilt').value=sv.nfilt;
if(sv.dsrch!==undefined&&document.getElementById('dsrch'))document.getElementById('dsrch').value=sv.dsrch;
if(focused){const fe=document.getElementById(focused);if(fe){fe.focus();if(fe.value)fe.setSelectionRange(fe.value.length,fe.value.length);}}
}


// ===== DARK MODE =====
function toggleDark(){document.body.classList.toggle('dark');S.dark=document.body.classList.contains('dark');if(S.dark&&document.body.classList.contains('study')){document.body.classList.remove('study');S.studyMode=false;}save();}
function toggleStudyMode(){document.body.classList.toggle('study');S.studyMode=document.body.classList.contains('study');if(S.studyMode&&document.body.classList.contains('dark')){document.body.classList.remove('dark');S.dark=false;}save();}
if(S.dark)document.body.classList.add('dark');
if(S.studyMode)document.body.classList.add('study');

// ===== FLASHCARD SPACED REP =====
function fcRate(q){// q: 0=again, 1=hard, 2=easy
const key='fc_'+S.fci%FLASH.length;
if(!S.fcsr)S.fcsr={};
if(!S.fcsr[key])S.fcsr[key]={n:0,next:0};
const s=S.fcsr[key];
const days=q===0?0:q===1?1:4;
s.n=q===0?0:s.n+1;s.next=Date.now()+days*86400000;
S.fci++;S.fcFlip=false;save();render();
}

// ===== SHARE =====
function shareQ(){
const q=QZ[pool[qi]];
let txt=q.q+'\n';
q.o.forEach((o,i)=>{txt+=(i===q.c?'✅ ':'❌ ')+o+'\n';});
if(navigator.share){navigator.share({title:'Pnimit Mega — Question',text:txt}).catch(()=>{});}
else if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>{const b=document.getElementById('shbtn');if(b){b.textContent='✅ הועתק';setTimeout(()=>b.textContent='📋 שתף',1500)}});
}
function shareApp(){
const url=location.href;
if(navigator.share){navigator.share({title:'Pnimit Mega — Internal Medicine Board Prep',text:'Internal Medicine Board Prep — Harrison\'s 22e + Required Articles + Calculators + Spaced Repetition',url:url}).catch(()=>{});}
else if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>alert('✅ Link copied!'));}
}

// ===== EXPORT PROGRESS =====

function importProgress(){
const input=document.createElement('input');input.type='file';input.accept='.json';
input.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
r.onload=ev=>{try{const d=JSON.parse(ev.target.result);Object.assign(S,d);save();render();
alert('✅ Progress imported successfully!');}catch(err){alert('❌ Invalid file');}};r.readAsText(f);};
input.click();}

function exportProgress(){
const data=JSON.stringify(S,null,2);
const blob=new Blob([data],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pnimit-progress.json';a.click();
}


function takeWeeklySnapshot(){
  try{
    const now=new Date();
    const weekKey='w_'+now.getFullYear()+'_'+Math.floor((now-new Date(now.getFullYear(),0,0))/(7*864e5));
    const snapshots=JSON.parse(localStorage.getItem('pnimit_weekly')||'{}');
    if(snapshots[weekKey])return; // already taken this week
    const tSt=S&&S.ts?S.ts:{};
    const snap={};
    for(let i=0;i<TOPICS.length;i++){const s=tSt[i]||{ok:0,no:0,tot:0};snap[i]=s.tot>0?Math.round(s.ok/s.tot*100):null;}
    snapshots[weekKey]={date:now.toISOString(),acc:snap};
    const keys=Object.keys(snapshots).sort();
    if(keys.length>52)delete snapshots[keys[0]];
    localStorage.setItem('pnimit_weekly',JSON.stringify(snapshots));
  }catch(e){}
}
function getTopicTrend(ti){
  try{
    const snapshots=JSON.parse(localStorage.getItem('pnimit_weekly')||'{}');
    const keys=Object.keys(snapshots).sort();
    if(keys.length<2)return null;
    const prev=snapshots[keys[keys.length-2]].acc[ti];
    const curr=snapshots[keys[keys.length-1]].acc[ti];
    if(prev===null||curr===null)return null;
    return curr-prev; // positive = improving
  }catch(e){return null;}
}

// ===== SHARED AI PROXY =====



function showHelp(){
const ov=document.createElement('div');
ov.id='help-overlay';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px';
ov.onclick=e=>{if(e.target===ov)ov.remove();};
const sec=(title,icon,color,items)=>`<div style="margin-bottom:14px">
<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:${color}">${icon} ${title}</div>
<div style="font-size:10px;line-height:1.8">${items}</div></div>`;
ov.innerHTML=`<div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;color:#1e293b;font-size:11px;line-height:1.7">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<div style="font-size:16px;font-weight:800">🏥 Pnimit Mega</div>
<button onclick="this.closest('#help-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8" aria-label="Close help">✕</button>
</div>
<div style="font-size:10px;color:#64748b;margin-bottom:16px">Israeli Internal Medicine Board Exam Prep (שלב א׳ פנימית) · P0064-2025 · Harrison's 22e · Works Offline</div>
<div style="padding:10px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:14px">
<div style="font-weight:700;font-size:11px;margin-bottom:6px;color:#065f46">🆕 What's New in v${APP_VERSION}</div>
<div style="font-size:10px;line-height:1.7;color:#047857">
${(CHANGELOG[APP_VERSION]||CHANGELOG[Object.keys(CHANGELOG).sort().pop()]||['No changelog available']).map(c=>'<b>'+c.split(' — ')[0]+'</b>'+(c.includes(' — ')?' — '+c.split(' — ').slice(1).join(' — '):'')).join('<br>')}
</div></div>
${sec('Quiz Filters','📝','#059669',
'<b>הכל</b> — All questions, shuffled<br>'+
'<b>2020–Jun25</b> — Filter by exam session<br>'+
'<b>🔥 Hard</b> — Questions you got wrong, worst-first<br>'+
'<b>⏱️ Slow</b> — Questions that took you &gt;60s<br>'+
'<b>🎯 Weak</b> — Your weakest topics<br>'+
'<b>🔄 Due</b> — Spaced repetition review (SM-2)<br>'+
'<b>📋 Exam</b> — 150q timed mock (3 hours)<br>'+
'<b>💀 Sudden Death</b> — One wrong = game over'
)}
${sec('AI Study Tools','🤖','#8b5cf6',
'All AI features work without an API key — powered by shared proxy.<br><br>'+
'<b>🤖 AI Explain</b> — Hebrew explanation of the correct answer<br>'+
'<b>🔬 Distractor Autopsy</b> — AI explains why EACH wrong option is wrong and when it would be correct<br>'+
'<b>🎓 Teach-Back</b> — Type your own explanation, AI grades it<br>'+
'<b>❌ Wrong Answer</b> — Report errors, AI verifies the answer key'
)}
${sec('Study Modes','📚','#dc2626',
'<b>🙈 Cover Options</b> — Hides choices, forces free recall<br>'+
'<b>⏱️ Pomodoro</b> — 25min focus / 5min break timer<br>'+
'<b>📖 Library</b> — Read Harrison chapters in-app (no PDF needed)<br>'+
'<b>🃏 Flashcards</b> — Cards with spaced repetition<br>'+
'<b>📄 Articles</b> — 10 required NEJM/Lancet articles<br>'+
'<b>🧮 Calculators</b> — CrCl, CHA₂DS₂-VASc, CURB-65, Wells, PADUA'
)}
${sec('Progress Tracking','📊','#f59e0b',
'<b>⏱️ Answer Timer</b> — Silently tracks time per question<br>'+
'<b>🗺️ Weak Spots Map</b> — Topic × Year heatmap (Track tab)<br>'+
'<b>📊 Accuracy Bars</b> — Per-topic accuracy sorted worst-first<br>'+
'<b>☁️ Cloud Sync</b> — Backup/restore progress across devices<br>'+
'<b>🔥 Streak</b> — Daily study streak'
)}
<div style="padding:10px;background:#f0fdf4;border-radius:10px;margin-bottom:12px">
<div style="font-weight:700;font-size:11px;margin-bottom:4px">🚀 Quick Start</div>
<div style="font-size:10px;line-height:1.7">1. Tap <b>Quiz</b> → answer questions<br>2. Check <b>🔬 Distractor Autopsy</b> for AI analysis<br>3. Review <b>Track</b> tab for weak spots<br>4. Use <b>🔥 Hard</b> filter to drill mistakes<br>5. Read <b>Library → Harrison</b> for chapter content</div>
</div>
<div style="text-align:center;font-size:9px;color:#94a3b8;line-height:1.5">
صدقة جارية الى من نحب<br>Ceaseless Charity — To the People That We Love<br><br>
<button onclick="shareApp()" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:10px;font-weight:600;cursor:pointer" aria-label="Share app with friends">📤 Share with Friends</button>
</div>
</div>`;
document.body.appendChild(ov);
}

// PWA + Background Sync + Daily Notification
// ===== UPDATE BANNER =====

// ===== PROACTIVE VERSION CHECK =====
(async function checkForUpdate(){
try{
const r=await fetch('sw.js',{cache:'no-store'});
const txt=await r.text();
const m=txt.match(/CACHE='pnimit-v([^']+)'/);
if(m&&m[1]!==APP_VERSION){
console.log('Update available: sw='+m[1]+' app='+APP_VERSION);
setTimeout(showUpdateBanner,1000);
}
}catch(e){}
})();













function showUpdateBanner(){
const existing=document.getElementById('update-banner');
if(existing)return;
const b=document.createElement('div');
b.id='update-banner';
b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 16px;font-size:12px;display:flex;align-items:center;gap:10px;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,.3)';
b.innerHTML=`<div><b>🆕 עדכון זמין!</b> גרסה חדשה מוכנה</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button onclick="applyUpdate()" style="background:#fff;color:#4f46e5;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer">🔄 עדכן עכשיו</button>
<button onclick="this.closest('#update-banner').remove()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer">✕</button>
</div>`;
document.body.prepend(b);
}
function applyUpdate(){
if(navigator.serviceWorker&&navigator.serviceWorker.controller){
navigator.serviceWorker.getRegistrations().then(regs=>{
regs.forEach(r=>{if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'});});
});
}
caches.keys().then(ks=>{ks.forEach(k=>caches.delete(k));});
setTimeout(()=>window.location.reload(true),500);
}

if('serviceWorker' in navigator){
// Force update — clears old cache-first SW
navigator.serviceWorker.getRegistrations().then(regs=>{
regs.forEach(r=>r.update());
});
caches.keys().then(ks=>{
const old=ks.filter(k=>k.startsWith('pnimit-')&&k!=='pnimit-v'+APP_VERSION);
old.forEach(k=>{caches.delete(k);console.log('Deleted old cache:',k);});
});
navigator.serviceWorker.register('sw.js').then(reg=>{
// Detect waiting worker = update available
if(reg.waiting){showUpdateBanner();}
reg.addEventListener('updatefound',()=>{
const nw=reg.installing;
if(nw){nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller){showUpdateBanner();}});}
});
// Schedule daily notification at 07:00
function scheduleDailyNotification(){
const now=new Date();
const target=new Date(now);
target.setHours(7,0,0,0);
if(now>=target)target.setDate(target.getDate()+1);
const delay=target-now;
setTimeout(()=>{
const dueN=getDueQuestions().length;
if(dueN>0&&reg.active){
reg.active.postMessage({type:'schedule-notification',dueCount:dueN});
}
scheduleDailyNotification();// Reschedule for next day
},delay);
}
// Request notification permission
if('Notification' in window&&Notification.permission==='default'){
Notification.requestPermission();
}
scheduleDailyNotification();
}).catch(function(){});
}
// queueBackgroundSync removed — dead code

_dataPromise.then(()=>{renderTabs();render();}).catch(()=>{});
