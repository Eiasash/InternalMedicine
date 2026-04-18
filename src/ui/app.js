// App entry point — orchestrates all modules, wires up window bindings for onclick handlers
import G from '../core/globals.js';
import { APP_VERSION, LS, TOPICS, EXAM_FREQ, CHANGELOG, BUILD_HASH } from '../core/constants.js';
import { sanitize, fmtT, safeJSONParse, getApiKey, setApiKey } from '../core/utils.js';
import { migrateToIDB } from '../core/state.js';
import '../core/data-loader.js'; // side-effect: populates G.QZ, G.TABS, etc.
import '../clock.js'; // side-effect: header clock (#hdr-sub)
import { getDueQuestions, getWeakTopics, getStudyStreak, getTopicStats, buildRescuePool,
         srScore, trackChapterRead, getChaptersDueForReading, isExamTrap } from '../sr/spaced-repetition.js';
import { buildPool, setFilt, setTopicFilt, startOnCallMode, exitOnCallMode, flipCard,
         onCallPick, renderOnCall, runExplainOnCall, pick, check, next, _storeDiff,
         startTopicMiniExam, endMiniExam, startExam, startMockExam, endExam, endMockExam,
         checkMockIntercept, showMockExamResult, buildMockExamPool } from '../quiz/engine.js';
import { requestWakeLock, startPomodoro, stopPomodoro, startSuddenDeath, endSuddenDeath,
         speakQuestion, startNextBestStep, startVoiceParser } from '../quiz/modes.js';
import { callAI } from '../ai/client.js';
import { explainWithAI, aiAutopsy, gradeTeachBack, renderExplainBox, toggleFlagExplain,
         startVoiceTeachBack } from '../ai/explain.js';
import { submitLeaderboardScore, fetchLeaderboard, showLeaderboard, renderFeedback,
         submitFeedbackForm, cloudBackup, cloudRestore, getDiagnostics, submitReport,
         saveAnswerReport, _sbDeviceId } from '../features/cloud.js';
import { renderQuiz, toggleBk, uploadQImage, removeQImage, viewImg, pauseTimed,
         startTimedQ, stopTimedMode, sdCheck, sdNext, initQuizEvents } from './quiz-view.js';
import { renderStudy, toggleNote, filterNotes, renderFlash, renderDrugs, initLearnEvents } from './learn-view.js';
import { renderLibrary, openHarrisonChapter,
         toggleHarrisonAI, submitHarrisonAI, aiSummarizeChapter, quizMeOnChapter,
         addChapterQsToBank, renderWrongAnswerLog, initLibraryEvents } from './library-view.js';
import { renderTrack, renderCalc, calcUp, calcEstScore, renderStudyPlan, renderExamTrendCard, renderPriorityMatrix,
         renderDailyPlan, renderSessionCard, setExamDate, exportCheatSheet,
         saveSessionSummary, initTrackEvents } from './track-view.js';
import { renderSearch, renderChat, sendChat, sendChatStarter, clearChat,
         showAnswerHardFail, initMoreEvents } from './more-view.js';

export function renderTabs(){
// safe-innerhtml: G.TABS is a hardcoded array of tab definitions (id/label/icon); no user input
document.getElementById('tb').innerHTML=G.TABS.map(t=>
`<button class="${t.id===G.tab?'on':''}" data-action="go" data-tab="${t.id}" aria-label="${t.l}"><span class="ic">${t.ic}</span>${t.l}</button>`
).join('');
}
export function go(t){G.tab=t;renderTabs();render()}

export function render(){
const el=document.getElementById('ct');
const focused=document.activeElement?.id;
const sv={srchi:document.getElementById('srchi')?.value,nfilt:document.getElementById('nfilt')?.value,dsrch:document.getElementById('dsrch')?.value};
if(G.tab!==G.lastTab){el.classList.remove('fade-in');void el.offsetWidth;el.classList.add('fade-in');window.scrollTo({top:0});G.lastTab=G.tab;}
switch(G.tab){
case'quiz':el.innerHTML=G.onCallMode?renderOnCall():renderQuiz();break;
case'learn':
  {const _subBar='<div style="display:flex;gap:4px;margin-bottom:12px;padding:4px;background:#f1f5f9;border-radius:12px">'+
  [{id:'study',ic:'📚',l:'Study'},{id:'flash',ic:'🃏',l:'Cards'},{id:'drugs',ic:'💊',l:'Drugs'}].map(s=>
    '<button data-action="learn-sub" data-sub="'+s.id+'" style="flex:1;padding:8px 4px;border:none;border-radius:10px;font-size:11px;font-weight:'+(G.learnSub===s.id?'700':'400')+';cursor:pointer;background:'+(G.learnSub===s.id?'#fff':'transparent')+';color:'+(G.learnSub===s.id?'#0f172a':'#64748b')+';box-shadow:'+(G.learnSub===s.id?'0 1px 3px rgba(0,0,0,.1)':'none')+'">'+s.ic+' '+s.l+'</button>'
  ).join('')+'</div>';
  let _body='';
  if(G.learnSub==='study')_body=renderStudy();
  else if(G.learnSub==='flash')_body=renderFlash();
  else if(G.learnSub==='drugs')_body=renderDrugs();
  el.innerHTML=_subBar+_body;}break; // safe-innerhtml: _subBar is static HTML; _body from internal render*() functions (no user input)
case'study':G.tab='learn';G.learnSub='study';el.innerHTML='';render();break;
case'flash':G.tab='learn';G.learnSub='flash';el.innerHTML='';render();break;
case'drugs':G.tab='learn';G.learnSub='drugs';el.innerHTML='';render();break;
case'lib':el.innerHTML=renderLibrary();break;
case'articles':G.libSec='articles';G.tab='lib';el.innerHTML=renderLibrary();break;
case'track':
  if(!G._sessionSaved&&(G._sessionOk+G._sessionNo)>=5){
    saveSessionSummary();G._sessionSaved=true;
  }
  el.innerHTML=renderTrack();break;
case'more':
  {const _moreBar='<div style="display:flex;gap:4px;margin-bottom:12px;padding:4px;background:#f1f5f9;border-radius:12px">'+
  [{id:'calc',ic:'🧮',l:'Calc'},{id:'search',ic:'🔍',l:'Search'},{id:'chat',ic:'💬',l:'Chat'},{id:'feedback',ic:'💡',l:'Feedback'}].map(s=>
    '<button data-action="more-sub" data-sub="'+s.id+'" style="flex:1;padding:8px 4px;border:none;border-radius:10px;font-size:11px;font-weight:'+(G.moreSub===s.id?'700':'400')+';cursor:pointer;background:'+(G.moreSub===s.id?'#fff':'transparent')+';color:'+(G.moreSub===s.id?'#0f172a':'#64748b')+';box-shadow:'+(G.moreSub===s.id?'0 1px 3px rgba(0,0,0,.1)':'none')+'">'+s.ic+' '+s.l+'</button>'
  ).join('')+'</div>';
  let _mBody='';
  if(G.moreSub==='calc')_mBody=renderCalc();
  else if(G.moreSub==='search')_mBody=renderSearch();
  else if(G.moreSub==='chat')_mBody=renderChat();
  else if(G.moreSub==='feedback')_mBody=renderFeedback();
  el.innerHTML=_moreBar+_mBody;}break; // safe-innerhtml: _moreBar is static HTML; _mBody from internal render*() functions (no user input)
case'calc':G.tab='more';G.moreSub='calc';el.innerHTML='';render();break;
case'search':G.tab='more';G.moreSub='search';el.innerHTML='';render();break;
case'chat':G.tab='more';G.moreSub='chat';el.innerHTML='';render();break;
case'book':case'syl':G.tab='lib';el.innerHTML=renderLibrary();break;
default:G.tab='quiz';el.innerHTML=renderQuiz();break;
}
// Ward modal

// Restore input values and focus
if(sv.srchi!==undefined&&document.getElementById('srchi'))document.getElementById('srchi').value=sv.srchi;
if(sv.nfilt!==undefined&&document.getElementById('nfilt'))document.getElementById('nfilt').value=sv.nfilt;
if(sv.dsrch!==undefined&&document.getElementById('dsrch'))document.getElementById('dsrch').value=sv.dsrch;
if(focused){const fe=document.getElementById(focused);if(fe){fe.focus();if(fe.value)fe.setSelectionRange(fe.value.length,fe.value.length);}}
}

// ===== DARK MODE =====
export function toggleDark(){document.body.classList.toggle('dark');G.S.dark=document.body.classList.contains('dark');if(G.S.dark&&document.body.classList.contains('study')){document.body.classList.remove('study');G.S.studyMode=false;}G.save();}
export function toggleStudyMode(){document.body.classList.toggle('study');G.S.studyMode=document.body.classList.contains('study');if(G.S.studyMode&&document.body.classList.contains('dark')){document.body.classList.remove('dark');G.S.dark=false;}G.save();}
if(G.S.dark)document.body.classList.add('dark');
if(G.S.studyMode)document.body.classList.add('study');

// ===== FLASHCARD SPACED REP =====
// fcRate moved to learn-view.js

// ===== SHARE =====
export function shareQ(){
const q=G.QZ[G.pool[G.qi]];
let txt=q.q+'\n';
q.o.forEach((o,i)=>{txt+=(i===q.c?'✅ ':'❌ ')+o+'\n';});
if(navigator.share){navigator.share({title:'Pnimit Mega — Question',text:txt}).catch(()=>{});}
else if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>{const b=document.getElementById('shbtn');if(b){b.textContent='✅ הועתק';setTimeout(()=>b.textContent='📋 שתף',1500)}});
}
export function shareApp(){
const url=location.href;
if(navigator.share){navigator.share({title:'Pnimit Mega — Internal Medicine Board Prep',text:'Internal Medicine Board Prep — Harrison\'s 22e + Required Articles + Calculators + Spaced Repetition',url:url}).catch(()=>{});}
else if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>alert('✅ Link copied!'));}
}

// ===== EXPORT PROGRESS =====

export function importProgress(){
const input=document.createElement('input');input.type='file';input.accept='.json';
input.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
r.onload=ev=>{try{const d=JSON.parse(ev.target.result);const allowed=new Set(Object.keys(G.S));const validated={};for(const k of Object.keys(d)){if(allowed.has(k))validated[k]=d[k];}Object.assign(G.S,validated);G.save();render();
alert('✅ Progress imported successfully!');}catch(err){alert('❌ Invalid file');}};r.readAsText(f);};
input.click();}

export function exportProgress(){
const data=JSON.stringify(G.S,null,2);
const blob=new Blob([data],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pnimit-progress.json';a.click();
}

export function takeWeeklySnapshot(){
  try{
    const now=new Date();
    const weekKey='w_'+now.getFullYear()+'_'+Math.floor((now-new Date(now.getFullYear(),0,0))/(7*864e5));
    const snapshots=JSON.parse(localStorage.getItem('pnimit_weekly')||'{}');
    if(snapshots[weekKey])return; // already taken this week
    const tSt=G.S&&G.S.ts?G.S.ts:{};
    const snap={};
    for(let i=0;i<TOPICS.length;i++){const s=tSt[i]||{ok:0,no:0,tot:0};snap[i]=s.tot>0?Math.round(s.ok/s.tot*100):null;}
    snapshots[weekKey]={date:now.toISOString(),acc:snap};
    const keys=Object.keys(snapshots).sort();
    if(keys.length>52)delete snapshots[keys[0]];
    localStorage.setItem('pnimit_weekly',JSON.stringify(snapshots));
  }catch(e){}
}

// ===== SHARED AI PROXY =====

export function showHelp(){
const ov=document.createElement('div');
ov.id='help-overlay';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px';
ov.onclick=e=>{if(e.target===ov)ov.remove();};
const sec=(title,icon,color,items)=>`<div style="margin-bottom:14px">
<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:${color}">${icon} ${title}</div>
<div style="font-size:10px;line-height:1.8">${items}</div></div>`;
// safe-innerhtml: help-overlay content is fully static — only interpolated values are APP_VERSION and CHANGELOG entries (code-controlled constants, no user input).
ov.innerHTML=`<div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;color:#1e293b;font-size:11px;line-height:1.7">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<div style="font-size:16px;font-weight:800">🏥 Pnimit Mega</div>
<button data-action="close-help" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8" aria-label="Close help">✕</button>
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
'<b>🗺️ Weak Spots Map</b> — Topic × Year heatmap (Track G.tab)<br>'+
'<b>📊 Accuracy Bars</b> — Per-topic accuracy sorted worst-first<br>'+
'<b>☁️ Cloud Sync</b> — Backup/restore progress across devices<br>'+
'<b>🔥 Streak</b> — Daily study streak'
)}
<div style="padding:10px;background:#f0fdf4;border-radius:10px;margin-bottom:12px">
<div style="font-weight:700;font-size:11px;margin-bottom:4px">🚀 Quick Start</div>
<div style="font-size:10px;line-height:1.7">1. Tap <b>Quiz</b> → answer questions<br>2. Check <b>🔬 Distractor Autopsy</b> for AI analysis<br>3. Review <b>Track</b> G.tab for weak spots<br>4. Use <b>🔥 Hard</b> filter to drill mistakes<br>5. Read <b>Library → Harrison</b> for chapter content</div>
</div>
<div style="text-align:center;font-size:9px;color:#94a3b8;line-height:1.5">
صدقة جارية الى من نحب<br>Ceaseless Charity — To the People That We Love<br><br>
<button data-action="share-app" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:10px;font-weight:600;cursor:pointer" aria-label="Share app with friends">📤 Share with Friends</button>
</div>
</div>`;
document.body.appendChild(ov);
}

// PWA + Background Sync + Daily Notification
// ===== UPDATE BANNER =====

// ===== SW UPDATE DETECTION =====
const UPDATE_DISMISS_KEY='pnimit_update_dismissed_'+APP_VERSION;

export function showUpdateBanner(){
if(document.getElementById('update-banner'))return;
if(localStorage.getItem(UPDATE_DISMISS_KEY))return;
const b=document.createElement('div');
b.id='update-banner';
b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 16px;font-size:12px;display:flex;align-items:center;gap:10px;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,.3)';
b.innerHTML=`<div><b>🆕 עדכון זמין!</b> גרסה חדשה מוכנה</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button data-action="apply-update" style="background:#fff;color:#4f46e5;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer">🔄 עדכן עכשיו</button>
<button data-action="close-update-banner" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer">✕</button>
</div>`;
document.body.prepend(b);
}
export function applyUpdate(){
// Clear dismissal so fresh version doesn't show stale suppression
try{localStorage.removeItem(UPDATE_DISMISS_KEY);}catch(e){}
// Properly await cache deletion before reload
(async()=>{
try{
if(navigator.serviceWorker&&navigator.serviceWorker.controller){
const regs=await navigator.serviceWorker.getRegistrations();
regs.forEach(r=>{if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'});});
}
const ks=await caches.keys();
await Promise.all(ks.map(k=>caches.delete(k)));
}catch(e){console.warn('Cache clear error:',e);}
window.location.reload();
})();
}

if('serviceWorker' in navigator){
// Clean up old caches on load
caches.keys().then(ks=>{
const old=ks.filter(k=>k.startsWith('pnimit-')&&k!=='pnimit-v'+APP_VERSION);
old.forEach(k=>{caches.delete(k);console.log('Deleted old cache:',k);});
});
function onNewWorkerReady(){
// Only show banner when a controller already exists (not first install)
if(navigator.serviceWorker.controller)showUpdateBanner();
}
navigator.serviceWorker.register('sw.js').then(reg=>{
// Detect waiting worker (update installed before this page load)
if(reg.waiting){onNewWorkerReady();return;}
// Detect future updates
reg.addEventListener('updatefound',()=>{
const nw=reg.installing;if(!nw)return;
nw.addEventListener('statechange',()=>{
if(nw.state==='installed'&&navigator.serviceWorker.controller)showUpdateBanner();
});
});
// Proactively check for updates
reg.update().catch(()=>{});
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

G._dataPromise.then(()=>{renderTabs();render();}).catch(()=>{});

// === Expose G on window for onclick handler access ===
window.G = G;

// === Wire up G references for cross-module calls ===
G.render = render;
G.renderTabs = renderTabs;

// === Window bindings for onclick/onchange/oninput handlers in HTML strings ===
const _w = window;
// Core navigation
_w.go = go; _w.render = render;
// Quiz
 _w.setTopicFilt = setTopicFilt;

// AI

// Library
_w.openHarrisonChapter = openHarrisonChapter;
 // aiSummarizeChapter: now handled by library-view delegation

// Learn
// toggleNote, filterNotes, fcRate: now handled by learn-view delegation
// Track
// calcUp: track-view delegation
// setExamDate: track-view delegation
// exportCheatSheet: track-view delegation
// Cloud & social
_w.showLeaderboard = showLeaderboard;
_w.cloudBackup = cloudBackup; _w.cloudRestore = cloudRestore;

// More
 // still needed by track-view onclick

// Settings
_w.toggleDark = toggleDark; _w.toggleStudyMode = toggleStudyMode;
_w.showHelp = showHelp; _w.applyUpdate = applyUpdate;
_w.importProgress = importProgress; _w.exportProgress = exportProgress;
_w.shareQ = shareQ;
 _w.shareApp = shareApp;
_w.sendChatStarter = sendChatStarter;

// === Event delegation (set up once, survives innerHTML changes) ===
// Tab bar (outside #ct)
document.getElementById('tb').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="go"]');
  if (el) go(el.dataset.tab);
});
// Sub-tab + view delegation (inside #ct)
const _ct = document.getElementById('ct');
_ct.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'learn-sub') { G.learnSub = el.dataset.sub; render(); }
  else if (el.dataset.action === 'more-sub') { G.moreSub = el.dataset.sub; render(); }
});
initMoreEvents(_ct);
initLibraryEvents(_ct);
initLearnEvents(_ct);
initTrackEvents(_ct);
initQuizEvents(_ct);

// === Header button delegation (outside #ct) ===
document.querySelector('.hdr').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'toggle-dark') toggleDark();
  else if (el.dataset.action === 'toggle-study') toggleStudyMode();
  else if (el.dataset.action === 'show-help') showHelp();
});

// === Body-level delegation for overlays, banners, modals ===
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'close-help') { const ov = document.getElementById('help-overlay'); if (ov) ov.remove(); }
  else if (el.dataset.action === 'share-app') shareApp();
  else if (el.dataset.action === 'apply-update') applyUpdate();
  else if (el.dataset.action === 'close-update-banner') { try{localStorage.setItem(UPDATE_DISMISS_KEY,'1');}catch(e){} const b = document.getElementById('update-banner'); if (b) b.remove(); }
  else if (el.dataset.action === 'close-mock-modal') { const m = document.getElementById('mexModal'); if (m) m.remove(); }
});

// === Boot ===
// Wake lock
requestWakeLock();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

// Header version
{const hv=document.getElementById('headerVer');if(hv)hv.textContent='v'+APP_VERSION;}

// IDB migration → initial render
migrateToIDB().then(()=>{
  renderTabs();render();
  if(!localStorage.getItem('pnimit_seen_help')){localStorage.setItem('pnimit_seen_help','1');setTimeout(showHelp,500);}
}).catch(e=>{console.error('IDB init failed, falling back to localStorage:',e);renderTabs();render();});

// Prevent accidental navigation during mock exam
window.addEventListener('beforeunload', function(e){
  if(G.examMode&&(G.S.qOk+G.S.qNo)>0){
    e.preventDefault(); e.returnValue='Mock exam in progress — are you sure you want to leave?';
    return e.returnValue;
  }
});
// iOS Safari: save on background
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState==='hidden'){
    try{localStorage.setItem('pnimit_mega',JSON.stringify(G.S));}catch(e){}
  }
});
// Data promise → render after load
