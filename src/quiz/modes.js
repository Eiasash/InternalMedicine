// Quiz modes & peripherals — extracted from pnimit-mega.html
// Wake lock, pomodoro, sudden death, blind recall, speech, NBS, voice parser
// References at runtime: render, QZ, pool, qi, sel, ans, filt, fmtT, srchQ, tab

// ===== SCREEN WAKE LOCK =====
let wakeLock=null;
async function requestWakeLock(){
try{
if('wakeLock' in navigator){
wakeLock=await navigator.wakeLock.request('screen');
wakeLock.addEventListener('release',()=>{wakeLock=null;});
}
}catch(e){/* user denied or unsupported */}
}
document.addEventListener('visibilitychange',()=>{
if(document.visibilityState==='visible')requestWakeLock();
});
requestWakeLock();

// ===== POMODORO TIMER =====
let pomoActive=false,pomoSec=3000,pomoBreak=false,pomoBreakSec=300,pomoInterval=null;
function startPomodoro(){
pomoActive=true;pomoSec=3000;pomoBreak=false;pomoBreakSec=300;
if(pomoInterval)clearInterval(pomoInterval);
pomoInterval=setInterval(()=>{
if(pomoBreak){
pomoBreakSec--;
if(pomoBreakSec<=0){pomoBreak=false;pomoSec=3000;}
}else{
pomoSec--;
if(pomoSec<=0){pomoBreak=true;pomoBreakSec=300;}
}
const bar=document.getElementById('pomo-fill');
if(bar&&!pomoBreak)bar.style.width=((3000-pomoSec)/3000*100)+'%';
const el=document.getElementById('pomo-time');
if(el)el.textContent=fmtT(pomoBreak?pomoBreakSec:pomoSec);
if(pomoBreak)renderPomoOverlay();
else{const ov=document.getElementById('pomo-overlay');if(ov)ov.remove();}
},1000);
render();
}
function stopPomodoro(){pomoActive=false;clearInterval(pomoInterval);pomoInterval=null;
const ov=document.getElementById('pomo-overlay');if(ov)ov.remove();render();}
function renderPomoOverlay(){
if(!pomoBreak)return;
if(document.getElementById('pomo-overlay'))return;
const div=document.createElement('div');div.id='pomo-overlay';div.className='pomo-overlay';
div.innerHTML=`<h2>Break Time</h2><p style="font-size:13px;margin-bottom:16px;color:#94a3b8">Rest your eyes. Stand up. Stretch.</p>
<div class="pomo-break-timer" id="pomo-break-display">${fmtT(pomoBreakSec)}</div>
<p style="font-size:10px;margin-top:12px;color:#64748b">Auto-resumes in ${Math.ceil(pomoBreakSec/60)} min</p>`;
document.body.appendChild(div);
const iv=setInterval(()=>{const d=document.getElementById('pomo-break-display');
if(!pomoBreak||!d){clearInterval(iv);const o=document.getElementById('pomo-overlay');if(o)o.remove();return;}
d.textContent=fmtT(pomoBreakSec);},1000);
}

// ===== SUDDEN DEATH MODE =====
let sdMode=false,sdStreak=0,sdPool=[],sdQi=0;
let sdLeaderboard=JSON.parse(localStorage.getItem('pnimit_sd_lb')||'[]');
function startSuddenDeath(){
sdMode=true;sdStreak=0;sdPool=QZ.map((_,i)=>i);
for(let i=sdPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sdPool[i],sdPool[j]]=[sdPool[j],sdPool[i]];}
sdQi=0;sel=null;ans=false;render();
}
function endSuddenDeath(){
sdLeaderboard.push({streak:sdStreak,date:new Date().toISOString().slice(0,10)});
sdLeaderboard.sort((a,b)=>b.streak-a.streak);
sdLeaderboard=sdLeaderboard.slice(0,10);
localStorage.setItem('pnimit_sd_lb',JSON.stringify(sdLeaderboard));
sdMode=false;
alert(`Sudden Death Over!\n\n💀 Streak: ${sdStreak} questions\n${sdStreak>=20?'Legendary!':sdStreak>=10?'Impressive!':'Keep practicing!'}`);
render();
}

// ===== BLIND RECALL STATE =====
let blindRecall=false;

// ===== DISTRACTOR AUTOPSY STATE =====
let autopsyMode=false,autopsyIdx=-1,autopsyDistractor=-1;

// ===== SPEECH SYNTHESIS =====
let isSpeaking=false;
function speakQuestion(){
if(!window.speechSynthesis)return;
if(isSpeaking){window.speechSynthesis.cancel();isSpeaking=false;render();return;}
const q=QZ[pool[qi]];if(!q)return;
let text=q.q+(q.img?' [Image: '+q.img+']':'')+'. ';q.o.forEach((o,i)=>{text+=String.fromCharCode(1488+i)+'. '+o+'. ';});
const u=new SpeechSynthesisUtterance(text);
u.lang='he-IL';u.rate=0.9;
u.onend=()=>{isSpeaking=false;render();};
u.onerror=()=>{isSpeaking=false;render();};
window.speechSynthesis.speak(u);isSpeaking=true;render();
}

// ===== NEXT BEST STEP FILTER =====
function startNextBestStep(){
const re=/הצעד הבא|הטיפול המתאים|first[- ]line|הטיפול הראשוני|הגישה הנכונה/i;
pool=[];
QZ.forEach((q,i)=>{if(re.test(q.q))pool.push(i);});
for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
qi=0;sel=null;ans=false;
_sessionOk=0;_sessionNo=0;_sessionBest={};_sessionWorse={};_sessionStart=Date.now();_sessionSaved=false;filt='nbs';render();
}





// ===== VOICE-TO-TEXT CASE PARSER =====
let voiceListening=false,voiceTranscript='';
function startVoiceParser(){
if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){alert('Speech Recognition not supported in this browser');return;}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const rec=new SR();rec.lang='he-IL';rec.interimResults=false;rec.maxAlternatives=1;
voiceListening=true;render();
rec.onresult=e=>{
voiceTranscript=e.results[0][0].transcript;voiceListening=false;
// Extract keywords and search
const words=voiceTranscript.split(/\s+/).filter(w=>w.length>2);
srchQ=words.join(' ');tab='search';render();
};
rec.onerror=()=>{voiceListening=false;render();};
rec.onend=()=>{voiceListening=false;render();};
rec.start();
}
