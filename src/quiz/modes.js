import G from '../core/globals.js';
import { fmtT } from '../core/utils.js';

try{G.sdLeaderboard=JSON.parse(localStorage.getItem('pnimit_sd_lb')||'[]')}catch(e){}
// Quiz modes & peripherals — extracted from pnimit-mega.html
// Wake lock, pomodoro, sudden death, blind recall, speech, NBS, voice parser
// References at runtime: G.render, G.QZ, G.pool, G.qi, G.sel, G.ans, G.filt, fmtT, G.srchQ, G.tab

// ===== SCREEN WAKE LOCK =====
export async function requestWakeLock(){
try{
if('G.wakeLock' in navigator){
G.wakeLock=await navigator.wakeLock.request('screen');
G.wakeLock.addEventListener('release',()=>{G.wakeLock=null;});
}
}catch(e){/* user denied or unsupported */}
}
// Wake lock init moved to app.js boot

// ===== POMODORO TIMER =====
export function startPomodoro(){
G.pomoActive=true;G.pomoSec=3000;G.pomoBreak=false;G.pomoBreakSec=300;
if(G.pomoInterval)clearInterval(G.pomoInterval);
G.pomoInterval=setInterval(()=>{
if(G.pomoBreak){
G.pomoBreakSec--;
if(G.pomoBreakSec<=0){G.pomoBreak=false;G.pomoSec=3000;}
}else{
G.pomoSec--;
if(G.pomoSec<=0){G.pomoBreak=true;G.pomoBreakSec=300;}
}
const bar=document.getElementById('pomo-fill');
if(bar&&!G.pomoBreak)bar.style.width=((3000-G.pomoSec)/3000*100)+'%';
const el=document.getElementById('pomo-time');
if(el)el.textContent=fmtT(G.pomoBreak?G.pomoBreakSec:G.pomoSec);
if(G.pomoBreak)renderPomoOverlay();
else{const ov=document.getElementById('pomo-overlay');if(ov)ov.remove();}
},1000);
G.render();
}
export function stopPomodoro(){G.pomoActive=false;clearInterval(G.pomoInterval);G.pomoInterval=null;
const ov=document.getElementById('pomo-overlay');if(ov)ov.remove();G.render();}
export function renderPomoOverlay(){
if(!G.pomoBreak)return;
if(document.getElementById('pomo-overlay'))return;
const div=document.createElement('div');div.id='pomo-overlay';div.className='pomo-overlay';
// safe-innerhtml: static copy; only interpolations are fmtT() (formatted timer string) and Math.ceil() of internal timer — no user input.
div.innerHTML=`<h2>Break Time</h2><p style="font-size:13px;margin-bottom:16px;color:#94a3b8">Rest your eyes. Stand up. Stretch.</p>
<div class="pomo-break-timer" id="pomo-break-display">${fmtT(G.pomoBreakSec)}</div>
<p style="font-size:10px;margin-top:12px;color:#64748b">Auto-resumes in ${Math.ceil(G.pomoBreakSec/60)} min</p>`;
document.body.appendChild(div);
const iv=setInterval(()=>{const d=document.getElementById('pomo-break-display');
if(!G.pomoBreak||!d){clearInterval(iv);const o=document.getElementById('pomo-overlay');if(o)o.remove();return;}
d.textContent=fmtT(G.pomoBreakSec);},1000);
}

// ===== SUDDEN DEATH MODE =====
export function startSuddenDeath(){
G.sdMode=true;G.sdStreak=0;G.sdPool=G.QZ.map((_,i)=>i);
for(let i=G.sdPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.sdPool[i],G.sdPool[j]]=[G.sdPool[j],G.sdPool[i]];}
G.sdQi=0;G.sel=null;G.ans=false;G.render();
}
export function endSuddenDeath(){
G.sdLeaderboard.push({streak:G.sdStreak,date:new Date().toISOString().slice(0,10)});
G.sdLeaderboard.sort((a,b)=>b.streak-a.streak);
G.sdLeaderboard=G.sdLeaderboard.slice(0,10);
localStorage.setItem('pnimit_sd_lb',JSON.stringify(G.sdLeaderboard));
G.sdMode=false;
alert(`Sudden Death Over!\n\n💀 Streak: ${G.sdStreak} questions\n${G.sdStreak>=20?'Legendary!':G.sdStreak>=10?'Impressive!':'Keep practicing!'}`);
G.render();
}

// ===== BLIND RECALL STATE =====

// ===== DISTRACTOR AUTOPSY STATE =====

// ===== SPEECH SYNTHESIS =====
export function speakQuestion(){
if(!window.speechSynthesis)return;
if(G.isSpeaking){window.speechSynthesis.cancel();G.isSpeaking=false;G.render();return;}
const q=G.QZ[G.pool[G.qi]];if(!q)return;
let text=q.q+(q.img?' [Image: '+q.img+']':'')+'. ';q.o.forEach((o,i)=>{text+=String.fromCharCode(1488+i)+'. '+o+'. ';});
const u=new SpeechSynthesisUtterance(text);
u.lang='he-IL';u.rate=0.9;
u.onend=()=>{G.isSpeaking=false;G.render();};
u.onerror=()=>{G.isSpeaking=false;G.render();};
window.speechSynthesis.speak(u);G.isSpeaking=true;G.render();
}

// ===== NEXT BEST STEP FILTER =====
export function startNextBestStep(){
const re=/הצעד הבא|הטיפול המתאים|first[- ]line|הטיפול הראשוני|הגישה הנכונה/i;
G.pool=[];
G.QZ.forEach((q,i)=>{if(re.test(q.q))G.pool.push(i);});
for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}
G.qi=0;G.sel=null;G.ans=false;
G._sessionOk=0;G._sessionNo=0;G._sessionBest={};G._sessionWorse={};G._sessionStart=Date.now();G._sessionSaved=false;G.filt='nbs';G.render();
}





// ===== VOICE-TO-TEXT CASE PARSER =====
export function startVoiceParser(){
if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){alert('Speech Recognition not supported in this browser');return;}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const rec=new SR();rec.lang='he-IL';rec.interimResults=false;rec.maxAlternatives=1;
G.voiceListening=true;G.render();
rec.onresult=e=>{
G.voiceTranscript=e.results[0][0].transcript;G.voiceListening=false;
// Extract keywords and search
const words=G.voiceTranscript.split(/\s+/).filter(w=>w.length>2);
G.srchQ=words.join(' ');G.tab='search';G.render();
};
rec.onerror=()=>{G.voiceListening=false;G.render();};
rec.onend=()=>{G.voiceListening=false;G.render();};
rec.start();
}
