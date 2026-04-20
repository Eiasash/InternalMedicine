import G from '../core/globals.js';
import { SUPA_URL, SUPA_ANON, TOPICS, EXAM_YEARS } from '../core/constants.js';
import { sanitize, heDir, fmtT, safeJSONParse, getOptShuffle, remapExplanationLetters, isMetaOption, toast } from '../core/utils.js';
import { getDueQuestions, getWeakTopics, isExamTrap, srScore, getTopicStats, buildRescuePool } from '../sr/spaced-repetition.js';
import { isChronicFail } from '../sr/fsrs-bridge.js';
import { renderExplainBox, toggleFlagExplain, explainWithAI, aiAutopsy, gradeTeachBack, startVoiceTeachBack } from '../ai/explain.js';
import { TOPIC_REF } from './track-view.js';
import { openHarrisonChapter } from './library-view.js';
import { buildPool, check, next, prev, pick, checkMockIntercept, exitOnCallMode, flipCard, runExplainOnCall, onCallPick,
         setFilt, setTopicFilt, toggleYearFilt, clearYearFilt, startExam, startMockExam, startMockExamByTag, showMockExamPicker, startTopicMiniExam,
         startOnCallMode, _storeDiff } from '../quiz/engine.js';
import { startPomodoro, stopPomodoro, startSuddenDeath, endSuddenDeath, speakQuestion, startNextBestStep } from '../quiz/modes.js';
import { showAnswerHardFail } from './more-view.js';

export function toggleBk(){G.S.bk[G.pool[G.qi]]=!G.S.bk[G.pool[G.qi]];G.save();G.render();}
export function toggleQNote(){
  const box=document.getElementById('qnote-box');if(box){box.remove();return;}
  const idx=G.pool[G.qi];const cur=(G.S.qnotes&&G.S.qnotes[idx])||'';
  const h=`<div id="qnote-box" style="margin:8px 0;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px"><div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px">📝 הערה לשאלה זו</div><textarea id="qnote-ta" dir="auto" placeholder="כתוב הערה אישית..." style="width:100%;min-height:70px;resize:vertical;font-family:Heebo,Inter,sans-serif;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:12px;background:#fff;color:#0f172a">${sanitize(cur)}</textarea><div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-p" data-action="save-qnote" style="flex:1;font-size:11px;min-height:36px">שמור</button><button class="btn" data-action="del-qnote" style="font-size:11px;min-height:36px;background:#fef2f2;color:#991b1b">מחק</button><button class="btn" data-action="cancel-qnote" style="font-size:11px;min-height:36px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0">ביטול</button></div></div>`;
  const tgt=document.querySelector('#ct .card')||document.querySelector('#ct');if(tgt)tgt.insertAdjacentHTML('beforeend',h);
  setTimeout(()=>{const t=document.getElementById('qnote-ta');if(t)t.focus();},50);
}
export function saveQNote(){
  const t=document.getElementById('qnote-ta');if(!t)return;
  const v=t.value.trim();const idx=G.pool[G.qi];
  if(!G.S.qnotes)G.S.qnotes={};
  if(v)G.S.qnotes[idx]=v;else delete G.S.qnotes[idx];
  G.save();toast('הערה נשמרה','success');
  const b=document.getElementById('qnote-box');if(b)b.remove();
  G.render();
}
export function delQNote(){
  const idx=G.pool[G.qi];
  if(G.S.qnotes)delete G.S.qnotes[idx];
  G.save();
  const b=document.getElementById('qnote-box');if(b)b.remove();
  G.render();
}


export async function uploadQImage(qIdx){
const input=document.createElement('input');
input.type='file';input.accept='image/*';input.capture='environment';
input.onchange=async function(){
const file=input.files[0];if(!file)return;
const ext=file.name.split('.').pop()||'png';
const fname='q'+qIdx+'_'+Date.now()+'.'+ext;
const statusEl=document.getElementById('img-status-'+qIdx);
if(statusEl)statusEl.textContent='⏳ Uploading...';
try{
const res=await fetch(SUPA_URL+'/storage/v1/object/question-images/'+fname,{
method:'POST',headers:{'Authorization':'Bearer '+SUPA_ANON,'Content-Type':file.type},body:file});
if(!res.ok)throw new Error('Upload failed: '+res.status);
const imgUrl=SUPA_URL+'/storage/v1/object/public/question-images/'+fname;
G.QZ[qIdx].img=imgUrl;
// Save to localStorage
const imgMap=safeJSONParse('pnimit_q_images',{});
imgMap[qIdx]=imgUrl;
localStorage.setItem('pnimit_q_images',JSON.stringify(imgMap));
if(statusEl)statusEl.textContent='✅ Image attached';
setTimeout(()=>G.render(),500);
}catch(e){if(statusEl)statusEl.textContent='❌ '+e.message;}
};
input.click();
}
export function removeQImage(qIdx){
G.QZ[qIdx].img=null;
const imgMap=safeJSONParse('pnimit_q_images',{});
delete imgMap[qIdx];
localStorage.setItem('pnimit_q_images',JSON.stringify(imgMap));
G.render();
}
// Load saved images on startup
(function(){
const imgMap=safeJSONParse('pnimit_q_images',{});
Object.entries(imgMap).forEach(([idx,url])=>{if(G.QZ[parseInt(idx)])G.QZ[parseInt(idx)].img=url;});
})();
export function viewImg(src){
const ov=document.createElement('div');
ov.className='img-overlay';
ov.innerHTML='<img src="'+sanitize(src)+'" alt="Zoomed">';
ov.onclick=function(){ov.remove();};
document.body.appendChild(ov);
}
export function pauseTimed(){
  G.timedPaused=!G.timedPaused;
  if(G.timedPaused){clearInterval(G.timedInt);}
  else{startTimedQ();}
  G.render();
}
export function startTimedQ(){
  clearInterval(G.timedInt);
  G.timedSec=90;
  G.timedInt=setInterval(()=>{
    G.timedSec--;
    const el=document.getElementById('timed-bar');
    if(el){
      const pct=Math.round(G.timedSec/90*100);
      const col=pct>50?'#10b981':pct>25?'#f59e0b':'#ef4444';
      el.style.width=pct+'%';
      el.style.background=col;
      el.parentElement.previousElementSibling&&(el.parentElement.previousElementSibling.textContent=G.timedSec+'s');
    }
    if(G.timedSec<=0){
      clearInterval(G.timedInt);
      // Auto-advance: show correct answer briefly then next
      if(!G.ans){
        G.sel=G.QZ[G.pool[G.qi]]?.c??0;
        checkMockIntercept();
        G.ans=true;
        const q=G.QZ[G.pool[G.qi]];
        if(q){G.S.qNo++;srScore(G.pool[G.qi],false);}
        G.save();G.render();
      }
      setTimeout(()=>{if(G.timedMode)next();},1800);
    }
  },1000);
}
export function stopTimedMode(){
  G.timedMode=false;
  clearInterval(G.timedInt);
  G.render();
}


















































export function renderQuiz(){
// ===== SUDDEN DEATH RENDERING =====
if(G.sdMode){
if(G.sdQi>=G.sdPool.length)G.sdQi=0;
const q=G.QZ[G.sdPool[G.sdQi]];
let h=`<div class="sudden-death-banner"><span style="font-weight:700;font-size:13px">💀 Sudden Death</span>
<span style="font-size:16px;font-weight:700">🔥 ${G.sdStreak}</span>
<button class="btn" style="background:rgba(255,255,255,.2);color:#fff;font-size:10px;padding:4px 10px" data-action="quit-sd" aria-label="Quit sudden death mode">Quit</button></div>`;
h+=`<div class="card" style="padding:16px">`;
if(G.timedMode&&!G.ans){
  h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
<span id="timed-count" style="font-size:11px;font-weight:700;color:#64748b;min-width:24px">${G.timedSec}s</span>
<div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
  <div id="timed-bar" style="height:100%;width:${Math.round(G.timedSec/90*100)}%;background:${G.timedSec>45?'#10b981':G.timedSec>22?'#f59e0b':'#ef4444'};border-radius:3px;transition:width .9s linear"></div>
</div>
<button data-action="pause-timed" style="font-size:9px;padding:2px 7px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;white-space:nowrap" aria-label="${G.timedPaused?'Resume timer':'Pause timer'}">${G.timedPaused?'▶ המשך':'⏸ עצור'}</button>
</div>`;
}
const _isFlagQ=(G.S.flagged||{})[G.pool[G.qi]];
const _eFlagQ=q.eFlag;
h+=`<p class="heb" style="font-size:13px;font-weight:700;line-height:1.7;margin-bottom:${q.img?'10':'16'}px">${_isFlagQ?'<span style="color:#dc2626;font-size:11px" title="Explanation flagged — verify">⚑ </span>':''  }${q.q}</p>`;
if(_eFlagQ&&G.ans){h+=`<div style="margin:6px 0;padding:6px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:10px;color:#991b1b;text-align:right;line-height:1.4;display:flex;align-items:center;gap:6px;justify-content:space-between" dir="rtl"><span style="flex:1">⚠️ AI flagged: ההסבר עשוי לא להתאים לתשובה הנכונה (${sanitize(_eFlagQ)})</span><button data-action="clear-eflag" data-idx="${G.pool[G.qi]}" style="font-size:9px;padding:3px 8px;background:#991b1b;color:#fff;border:none;border-radius:6px;cursor:pointer;flex:0 0 auto">✓ אמת</button></div>`;}
if(q.img){h+=`<div style="margin-bottom:14px;text-align:center;position:relative"><img src="${q.img}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer" data-action="view-img" loading="lazy"><button data-action="remove-img" data-idx="${G.pool[G.qi]}" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:12px;cursor:pointer">✕</button>${q.imgDep?'<div style="margin-top:6px;padding:6px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;font-size:10px;color:#92400e;text-align:right;line-height:1.4;display:flex;align-items:center;gap:6px;justify-content:space-between" dir="rtl"><span style="flex:1">⚠️ שאלה תלוית-תמונה: ההסבר עלול להיות שגוי.</span><button data-action="mark-verified" data-idx="'+G.pool[G.qi]+'" style="font-size:9px;padding:3px 8px;background:#d97706;color:#fff;border:none;border-radius:6px;cursor:pointer;flex:0 0 auto">✓ מאומת</button></div>':''}</div>`;}
if(!q.img&&!G.examMode){h+=`<div style="margin-bottom:10px"><button data-action="upload-img" data-idx="${G.pool[G.qi]}" style="font-size:10px;padding:4px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer">📷 Attach Image</button><span id="img-status-${G.pool[G.qi]}" style="font-size:10px;color:#94a3b8;margin-left:6px"></span></div>`;}
q.o.forEach((o,i)=>{
let cls='qo';
if(G.ans){cls+=' lk';if(i===q.c)cls+=' ok';else if(i===G.sel)cls+=' no';else cls+=' dim';}
else if(i===G.sel)cls+=' sel';
h+=`<button class="${cls}" data-action="pick" data-i="${i}" aria-label="Option ${i+1}: ${o}" dir="${heDir(o)}">${o}</button>`;
});
if(!G.ans)h+=`<button class="btn btn-p" data-action="sd-check"${G.sel===null?' disabled':''} aria-label="Check answer">בדוק</button>`;
else h+=`<button class="btn btn-d" data-action="sd-next" aria-label="Next question">הבאה ←</button>`;
h+=`</div>`;
// Leaderboard
if(G.sdLeaderboard.length){
h+=`<div class="card" style="padding:14px"><div style="font-weight:700;font-size:12px;margin-bottom:8px">🏆 Leaderboard</div>`;
G.sdLeaderboard.forEach((e,i)=>{h+=`<div class="leaderboard-row"><span>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)} ${e.streak} questions</span><span style="color:#94a3b8">${e.date}</span></div>`;});
h+=`</div>`;}
return h;
}

if(!G.pool.length)buildPool();
if(G.qi>=G.pool.length)G.qi=0;
const q=G.QZ[G.pool[G.qi]];const tot=G.S.qOk+G.S.qNo;const pct=tot?Math.round(G.S.qOk/tot*100)+'%':'—';
const bk=G.S.bk[G.pool[G.qi]];
const dueN=getDueQuestions().length;
// Pomodoro bar
let h=G.pomoActive?`<div class="pomo-bar"><div class="pomo-fill" id="pomo-fill" style="width:${(3000-G.pomoSec)/3000*100}%"></div></div>
<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#ecfdf5;border-radius:10px;margin-bottom:10px;font-size:11px">
<span>⏱️ Pomodoro</span><span class="timer" id="pomo-time" style="font-weight:700">${fmtT(G.pomoSec)}</span>
<button data-action="stop-pomo" style="font-size:10px;color:#dc2626;font-weight:600" aria-label="Stop pomodoro timer">Stop</button></div>`:'';
h+=G.examMode?(()=>{
  const answered=G.S.qOk+G.S.qNo;
  const isMock=!!G.mockExamResults;
  const target=isMock?108:72; // 10800/100 vs 10800/150
  const elapsed=10800-G.examSec;
  const avgSec=answered>0?Math.floor(elapsed/answered):0;
  const paceOk=avgSec<=target*1.1;
  const paceStr=answered>0?`avg ${fmtT(avgSec)}/q · ${paceOk?'<span style="color:#4ade80">✓</span>':'<span style="color:#f87171">⚠️ slow</span>'}`:'';
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px 12px;background:#0f172a;border-radius:12px;color:#fff">
<span style="font-weight:700;font-size:11px">${isMock?'🎯 Mock':'📋 Exam'}<br><span style="font-size:9px;font-weight:400">${paceStr}</span></span>
<span id="etimer" class="timer" style="font-size:16px;font-weight:700">${fmtT(G.examSec)}</span>
<span style="font-size:11px">${G.qi+1}/${isMock?G.pool.length:150}</span></div>`;
})():'';
if(!G.examMode){
h+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<div class="sec-t">Quiz</div>
<div style="display:flex;gap:4px;flex-wrap:wrap">
<button data-action="start-exam" class="btn btn-d" style="font-size:10px;padding:5px 12px" aria-label="Start exam with 150 questions">📋 Exam (150q)</button><button data-action="start-mock" class="btn btn-d" style="font-size:10px;padding:5px 12px;background:#7c3aed;color:#fff" aria-label="Start mock exam with 100 questions">🎯 Mock (100q)</button>
<span class="tt-wrap"><button data-action="start-sd" class="btn" style="font-size:10px;padding:5px 12px;background:#fef2f2;color:#dc2626" aria-label="Start sudden death mode">💀 Sudden Death</button><button data-action="start-oncall" class="btn" style="font-size:10px;padding:5px 12px;background:#0f172a;color:#7dd3fc" aria-label="Start on-call mode">🌙 On-call</button><button class="tt-icon" tabindex="0" aria-label="Info about sudden death mode">ⓘ</button><div class="tt-box">One wrong answer ends the session. Builds high-stakes exam pressure.</div></span>
${!G.pomoActive?'<span class="tt-wrap"><button data-action="start-pomo" class="btn" style="font-size:10px;padding:5px 12px;background:#ecfdf5;color:#059669" aria-label="Start pomodoro timer">⏱️ Pomodoro</button><button class="tt-icon" tabindex="0" aria-label="Info about pomodoro timer">ⓘ</button><div class="tt-box">25min focus / 5min break study timer. Helps maintain concentration.</div></span>':''}
</div>
</div>`;
h+=`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">`;
const _trapCount=G.QZ.filter((_,i)=>isExamTrap(i)).length;
const _aiCount=G.QZ.filter(q=>q.t==='Harrison').length;
const _yearSel=Array.isArray(G.years)?G.years:[];
const _inYearMode=G.filt==='years'&&_yearSel.length>0;
const filts=[['all',`הכל (${G.QZ.length})`],['2020','20'],['2021-Jun','Jun21'],['2022-Jun','Jun22'],['2023-Jun','Jun23'],['2024-May','May24'],['2024-Oct','Oct24'],['2025-Jun','Jun25'],['Harrison',`🤖 AI (${_aiCount})`],['hard','🔥 Hard'],['slow','⏱️ Slow'],['weak','🎯 Weak'],['due','🔄 Due'],['traps',`🪤 Traps (${_trapCount})`],['nbs','🎯 Next Best Step']];
// Rescue Drill pill
const _weakForPill=getWeakTopics(3);
if(_weakForPill.length&&_weakForPill[0].pct!==null&&_weakForPill[0].pct<65)filts.push(['rescue','🚨 Rescue']);
if(dueN>0)filts.push(['due',`🔄 Due (${dueN})`]);
filts.forEach(([f,l])=>{
if(f==='rescue')h+=`<span class="pill ${G.filt==='rescue'?'on':''}" data-action="filter-rescue">${l}</span>`;
else if(f==='nbs')h+=`<span class="pill ${G.filt==='nbs'?'on':''}" data-action="filter-nbs">${l}</span>`;
else if(EXAM_YEARS.includes(f)){
  const _yOn=_yearSel.includes(f);
  h+=`<span class="pill ${_yOn?'on':''}" data-action="filter-year" data-f="${f}" title="Click to toggle — multi-select allowed">${l}${_yOn?' ✓':''}</span>`;
}
else if(f==='all')h+=`<span class="pill ${G.filt==='all'&&!_inYearMode?'on':''}" data-action="filter" data-f="${f}">${l}</span>`;
else h+=`<span class="pill ${G.filt===f&&G.filt!=='topic'?'on':''}" data-action="filter" data-f="${f}">${l}</span>`;
});
// "Clear years" pill, visible only when ≥2 years are selected to reduce clutter
if(_yearSel.length>=2){
  h+=`<span class="pill" style="background:#fef2f2;color:#dc2626" data-action="filter-year-clear" title="Clear exam year filter">✕ ${_yearSel.length} years</span>`;
}
h+=`</div>`;
// Mode toggles — Distractor Autopsy is always on (rendered on every reveal), no toggle
h+=`<div style="display:flex;gap:8px;margin-bottom:10px;font-size:10px;align-items:center">
<span class="tt-wrap"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${G.blindRecall?'checked':''} data-action="toggle-blind"> 🙈 Cover Options</label><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">Hides answer choices — forces you to recall the answer before seeing options.</div></span>
<span class="tt-wrap"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${G.timedMode?'checked':''} data-action="toggle-timed"> ⏱ Timed (90s)</label><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">90-second countdown per question. Auto-advances when time runs out — marks as wrong. Builds exam-condition reflexes.</div></span>
<span style="color:#64748b;font-size:10px" title="After every reveal, you see why each wrong answer is wrong and when it would be correct.">🔬 Distractor Autopsy on</span>
</div>`;
h+=`<div style="display:flex;gap:6px;margin-bottom:10px"><select class="calc-in" style="font-size:11px;padding:6px 10px;flex:1" data-action="topic-select">
<option value="-1"${G.filt!=='topic'?' selected':''}>📂 Filter by topic…</option>`;
TOPICS.forEach((t,i)=>{h+=`<option value="${i}"${G.filt==='topic'&&G.topicFilt===i?' selected':''}>${t}</option>`;});
h+=`</select>`;
// Feature 2: Topic mini-exam button
if(G.filt==='topic'&&G.topicFilt>=0){
const _tqCount=G.QZ.filter(q=>q.ti===G.topicFilt).length;
h+=`<button class="btn btn-d" style="font-size:10px;padding:6px 12px;white-space:nowrap" data-action="start-mini-exam" data-ti="${G.topicFilt}" aria-label="Start topic mini-exam">🎯 Mini Exam (${Math.min(_tqCount,20)}q)</button>`;
}
h+=`</div>`;
}
if(!G.pool.length){h+=`<div class="card" style="padding:24px;text-align:center"><p style="font-size:13px;color:#94a3b8">${G.filt==='due'?'🎉 No questions due for review!':'No questions match this filter.'}</p></div>`;return h;}
h+=`<div class="progress-bar"><div class="fill" style="width:${Math.round((G.qi+1)/G.pool.length*100)}%"></div></div>`;
h+=`<div class="card" style="padding:16px">`;
if(G.timedMode&&!G.ans){
  h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
<span id="timed-count" style="font-size:11px;font-weight:700;color:#64748b;min-width:24px">${G.timedSec}s</span>
<div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
  <div id="timed-bar" style="height:100%;width:${Math.round(G.timedSec/90*100)}%;background:${G.timedSec>45?'#10b981':G.timedSec>22?'#f59e0b':'#ef4444'};border-radius:3px;transition:width .9s linear"></div>
</div>
<button data-action="pause-timed" style="font-size:9px;padding:2px 7px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;white-space:nowrap" aria-label="${G.timedPaused?'Resume timer':'Pause timer'}">${G.timedPaused?'▶ המשך':'⏸ עצור'}</button>
</div>`;
}
const topicName=q.ti>=0&&TOPICS[q.ti]?TOPICS[q.ti]:'';
const _cf=isChronicFail(G.S.sr[G.pool[G.qi]]);
h+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${_cf?'<span title="Chronic difficulty — read the chapter instead of drilling" style="font-size:14px;cursor:default">🔴</span>':''}${isExamTrap(G.pool[G.qi])?'<span title="Exam trap — many people pick the same wrong answer" style="font-size:12px;cursor:default">🪤</span>':''}<span class="tag-year" style="background:${q.t==='Harrison'?'#faf5ff':'#eff6ff'};color:${q.t==='Harrison'?'#7c3aed':'#1d4ed8'};font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">${q.t==='Harrison'?'🤖 AI — Harrison\'s':'📝 '+q.t}</span>${topicName?`<span class="tag-topic" style="background:#f0fdf4;color:#166534;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px">${topicName}</span>`:''}${(()=>{const ref=TOPIC_REF[q.ti];if(!ref)return '';return '';})()}</div>
<div style="display:flex;align-items:center;gap:8px">
<button data-action="speak-q" class="speech-btn${G.isSpeaking?' speaking':''}" title="Read aloud" aria-label="Read question aloud">🔊</button>
<button data-action="share-q" id="shbtn" class="share-btn" title="Share" aria-label="Share question">📋</button><button data-action="toggle-qnote" style="font-size:14px;width:34px;height:34px;min-height:34px;background:${(G.S.qnotes&&G.S.qnotes[G.pool[G.qi]])?'#fef3c7':'#f1f5f9'};color:${(G.S.qnotes&&G.S.qnotes[G.pool[G.qi]])?'#92400e':'#64748b'};border:1px solid ${(G.S.qnotes&&G.S.qnotes[G.pool[G.qi]])?'#fbbf24':'#e2e8f0'};border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center" title="Note for this question" aria-label="Note">✎</button><button data-action="toggle-bk" style="font-size:14px;width:34px;height:34px;min-height:34px;background:${bk?'#fef3c7':'#f1f5f9'};color:${bk?'#92400e':'#64748b'};border:1px solid ${bk?'#fbbf24':'#e2e8f0'};border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center" title="Bookmark" aria-label="Bookmark">${bk?'★':'☆'}</button>
<span style="color:#94a3b8;font-size:10px">${G.qi+1}/${G.pool.length}</span>
</div></div>`;
h+=`<p class="heb" style="font-size:13px;font-weight:700;line-height:1.7;margin-bottom:${q.img?'10':'16'}px" dir="${heDir(q.q)}">${q.q}</p>`;
if(G.S.qnotes&&G.S.qnotes[G.pool[G.qi]]){h+=`<div style="margin:0 0 12px;padding:8px 10px;background:#fffbeb;border-right:3px solid #d97706;border-radius:8px;font-size:11px;line-height:1.6;color:#475569;text-align:right;cursor:pointer" dir="${heDir(G.S.qnotes[G.pool[G.qi]])}" data-action="toggle-qnote" title="Click to edit">📝 ${sanitize(G.S.qnotes[G.pool[G.qi]])}</div>`;}
if(q.img){h+=`<div style="margin-bottom:14px;text-align:center"><img src="${q.img}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer" data-action="view-img" loading="lazy"></div>`;}
const _shuf=getOptShuffle(G.pool[G.qi],q);
_shuf.forEach((origI,dispJ)=>{
const o=q.o[origI];
let cls='qo';
if(G.ans){cls+=' lk';if(!G.examMode){if(origI===q.c)cls+=' ok';else if(origI===G.sel)cls+=' no';else cls+=' dim';}else if(origI===G.sel)cls+=' sel';}
else if(origI===G.sel)cls+=' sel';
const blurCls=G.blindRecall&&!G.ans&&origI!==G.sel?' qo-blur':'';
const autopsyCls=(G.autopsyMode&&G.ans&&!G.examMode&&origI!==q.c&&origI===G.autopsyDistractor)?' distractor-highlight':'';
h+=`<button class="${cls}${blurCls}${autopsyCls}" data-action="pick" data-i="${origI}" aria-label="Option ${origI+1}" dir="${heDir(o)}"><span>${o}</span>${q.oi&&q.oi[origI]?'<img src="'+sanitize(q.oi[origI])+'" style="max-width:100%;max-height:120px;margin-top:6px;border-radius:6px" loading="lazy">':''}</button>`;
});
h+=`<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">`;
if(!G.ans){
const _confLabel='';
h+=`<div style="display:flex;gap:6px;align-items:center"><button class="btn btn-p" data-action="check-answer"${G.sel===null?' disabled':''} aria-label="Check answer" style="flex:1;min-height:44px">${_confLabel} בדוק</button>`;if(!G.examMode)h+=`<button class="btn" data-action="give-up" style="background:#fff3e0;color:#d97706;font-size:11px;padding:6px 14px;min-height:44px" aria-label="Show answer">👁 לא יודע</button>`;h+=`</div>`;}
else{
// POST-ANSWER: Next button FIRST
h+=`<div style="display:flex;gap:6px;align-items:stretch;margin-bottom:8px">`;
if(!G.examMode)h+=`<button class="btn" data-action="prev-q" style="flex:0 0 auto;min-height:48px;padding:0 14px;font-size:11px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:10px;${G.qi<=0?'opacity:0.4;pointer-events:none;':''}" aria-label="Previous question">קודמת ←</button>`;
h+=`<button class="btn btn-d" data-action="next-q" aria-label="${G.examMode&&G.qi+1>=150?'Finish exam':'Next question'}" style="flex:1;min-height:48px;padding:10px 18px;font-size:14px;font-weight:700">${G.examMode&&G.qi+1>=150?'סיים':'→ הבאה'}</button>`;
h+=`</div>`;

// Why-wrong (secondary)
if(!G.examMode&&G.sel!==q.c&&!G._wrongReason){
h+=`<div style="margin-bottom:8px">
<div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:6px">Why did you get it wrong?</div>
<div style="display:flex;gap:6px;flex-wrap:wrap">
<button class="btn" style="font-size:11px;padding:8px 12px;min-height:40px;background:#fef2f2;color:#991b1b" data-action="wrong-reason" data-r="no_knowledge">📚 Didn't know</button>
<button class="btn" style="font-size:11px;padding:8px 12px;min-height:40px;background:#fffbeb;color:#92400e" data-action="wrong-reason" data-r="misread">👓 Misread</button>
<button class="btn" style="font-size:11px;padding:8px 12px;min-height:40px;background:#eff6ff;color:#1e40af" data-action="wrong-reason" data-r="between_2">⚖️ Between 2</button>
<button class="btn" style="font-size:11px;padding:8px 12px;min-height:40px;background:#f5f3ff;color:#6d28d9" data-action="wrong-reason" data-r="silly">🤦 Silly</button>
</div></div>`;
}
// Read chapter
if(!G.examMode&&G.sel!==q.c&&q.ti>=0){
const _chRef=TOPIC_REF[q.ti];
if(_chRef&&_chRef.s==='har'){
h+=`<button class="btn" data-action="read-chapter" style="font-size:11px;padding:10px 12px;min-height:44px;background:#ede9fe;color:#7c3aed;margin-bottom:6px;width:100%;font-weight:700">📖 Read: ${_chRef.l} — you're weak here</button>`;
}
}
// Difficulty
if(!G.examMode){
h+=`<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
<span style="font-size:10px;color:#94a3b8">Difficulty:</span>
<button class="btn" style="font-size:11px;padding:6px 12px;min-height:36px;${G._diffRating==='easy'?'background:#dcfce7;color:#166534':'background:#f8fafc;color:#94a3b8'}" data-action="diff-rating" data-d="easy">Easy</button>
<button class="btn" style="font-size:11px;padding:6px 12px;min-height:36px;${G._diffRating==='med'?'background:#fef9c3;color:#854d0e':'background:#f8fafc;color:#94a3b8'}" data-action="diff-rating" data-d="med">Medium</button>
<button class="btn" style="font-size:11px;padding:6px 12px;min-height:36px;${G._diffRating==='hard'?'background:#fecaca;color:#991b1b':'background:#f8fafc;color:#94a3b8'}" data-action="diff-rating" data-d="hard">Hard</button>
</div>`;
}
}
h+=`</div>`;

// Teach-Back box
if(G.ans&&!G.examMode&&G.sel===q.c){
if(!G.teachBackState){
h+='<div style="margin-top:12px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;padding:12px">';
h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:700;color:#065f46;direction:rtl">🎓 Teach-Back: הסבר מדוע זו התשובה הנכונה</span><button data-action="voice-teachback" id="tb-mic-btn" style="font-size:16px;padding:4px 8px;background:#ecfdf5;border:none;border-radius:8px;cursor:pointer" title="הקלט קולי" aria-label="Record voice teach-back">🎙️</button></div>';
h+='<textarea id="tbInput" dir="rtl" style="width:100%;min-height:60px;resize:vertical;font-family:Heebo,sans-serif;border:1px solid #a7f3d0;border-radius:8px;padding:8px;font-size:12px" placeholder="הקלד את ההסבר שלך..." aria-label="Teach-back explanation"></textarea>';
h+='<div style="display:flex;gap:8px;margin-top:8px">';
h+='<button class="btn btn-g" style="flex:1;font-size:11px" data-action="grade-teachback" aria-label="Grade teach-back with AI">🤖 Grade it</button>';
h+='<button class="btn btn-o" style="font-size:11px" data-action="skip-teachback" aria-label="Skip teach-back">דלג</button>';
h+='</div></div>';
}else if(G.teachBackState==='grading'){
h+='<div style="margin-top:12px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;padding:12px;text-align:center"><div style="font-size:12px;color:#065f46">⏳ Grading...</div></div>';
}else if(G.teachBackState&&G.teachBackState!=='skip'){
var scoreEmoji=G.teachBackState.score===3?'🟢':G.teachBackState.score===2?'🟡':'🔴';
var scoreLabel=G.teachBackState.score===3?'Excellent!':G.teachBackState.score===2?'Partial':'Needs work';
h+='<div style="margin-top:12px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;padding:12px">';
h+='<div style="font-size:13px;font-weight:700;margin-bottom:4px">'+scoreEmoji+' '+scoreLabel+'</div>';
if(G.teachBackState.feedback){
  const axes=[['mechanism','מנגנון'],['criteria','קריטריון'],['exception','חריג']];
  const axesDots=axes.map(([k,l])=>{const v=G.teachBackState[k];return v===undefined?'':`<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${v?'#dcfce7':'#fee2e2'};color:${v?'#166534':'#991b1b'}">${l} ${v?'✓':'✗'}</span>`;}).join(' ');
  if(axesDots)h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">'+axesDots+'</div>';
  h+='<div style="font-size:11px;line-height:1.7;text-align:right;unicode-bidi:plaintext" dir="'+heDir(G.teachBackState.feedback)+'">'+sanitize(G.teachBackState.feedback)+'</div>';
}
h+='</div>';
}
}
if(G.ans&&!G.examMode){
const note=q.ti>=0?(G.NOTES_BY_TI&&G.NOTES_BY_TI[q.ti])||null:null;
if(note){
const correctText=q.o[q.c];
const sentences=note.notes.split(/\.\s+/);
const relevant=sentences.filter(s=>s.length>20).filter(s=>{
const sl=s.toLowerCase(),ql=q.q.toLowerCase(),cl=correctText.toLowerCase();
return cl.split(/\s+/).filter(w=>w.length>3).some(w=>sl.includes(w.toLowerCase()))||ql.split(/\s+/).filter(w=>w.length>4).some(w=>sl.includes(w.toLowerCase()));
}).slice(0,3);
h+=`<div class="explain-box" style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:11px;line-height:1.7;color:#166534">`;
h+=`<div style="font-weight:700;margin-bottom:4px">💡 ${note.topic}</div>`;
if(relevant.length)h+=`<div style="margin-bottom:6px">${relevant.join('. ')}.</div>`;
else h+=`<div style="margin-bottom:6px;color:#64748b;font-style:italic">Correct answer: <b>${correctText}</b></div>`;
h+=`<div style="font-size:9px;color:#059669;border-top:1px solid #bbf7d0;padding-top:4px;margin-top:4px">📖 Source: ${note.ch} · ${q.t}</div>`;
h+=`</div>`;
}
}
// Built-in explanation (every question has one)
if(G.ans&&!G.examMode&&q.e){
const _eIss=q.e_issue;
h+=`<div style="margin-top:8px;padding:10px 12px;background:${_eIss?'#fffbeb':'#eff6ff'};border:1px solid ${_eIss?'#fcd34d':'#bfdbfe'};border-radius:10px;font-size:11px;line-height:1.7;color:${_eIss?'#92400e':'#1e40af'};text-align:right" dir="${heDir(q.e)}">`;
if(_eIss){h+=`<div style="font-size:10px;font-weight:700;margin-bottom:6px;padding:4px 8px;background:#fef3c7;border-radius:6px;display:flex;align-items:center;gap:6px;justify-content:space-between"><span>⚠️ ההסבר הזה עלול להיות שגוי — AI איתר חוסר עקביות מול התשובה הנכונה</span><button data-action="mark-e-verified" data-idx="${G.pool[G.qi]}" style="font-size:9px;padding:3px 8px;background:#d97706;color:#fff;border:none;border-radius:6px;cursor:pointer;flex:0 0 auto">✓ מאומת</button></div>`;}
h+=`<div style="font-weight:700;margin-bottom:4px;font-size:10px">📝 הסבר</div>`;
h+=`<div style="unicode-bidi:plaintext" dir="${heDir(q.e)}">${remapExplanationLetters(q.e,_shuf).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')}</div>`;
h+=`</div>`;
}
// AI Explain button
if(G.ans&&!G.examMode){
  var _aiIdx=G.pool[G.qi];
  h+='<div id="ai-explain-'+_aiIdx+'" style="margin-top:6px"></div>';
  if(G._exCache[_aiIdx]&&!G._exCache[_aiIdx].err){
    setTimeout(function(){renderExplainBox(_aiIdx);},0);
  } else {
    h+='<button class="btn btn-g" style="width:100%;margin-top:4px;font-size:11px" data-action="ai-explain" data-idx="'+_aiIdx+'">🤖 הסבר AI ('+(G._exCache[_aiIdx]?'נסה שוב':'קלוד אופוס')+')</button>';
  }
}
// Distractor Autopsy — ALWAYS ON when answer revealed (not a toggle).
// Renders per-option card: ✓/✗ + rationale from offline G.DIS (pre-generated).
// Falls back to on-demand AI (G._exCache['autopsy_'+qIdx]) if offline entry missing.
if(G.ans&&!G.examMode){
  const _qIdx=G.pool[G.qi];
  const _dist=(G.DIS&&G.DIS[_qIdx])||null;
  const _apKey='autopsy_'+_qIdx;
  const _aiTxt=G._exCache[_apKey];
  h+=`<div style="padding:12px;margin-top:10px;border:2px solid #f59e0b;border-radius:12px;background:#fffbeb">
<div style="font-weight:700;font-size:11px;margin-bottom:8px">🔬 Distractor Autopsy — למה כל תשובה שגויה</div>`;
  if(_dist){
    // Offline path — render each option with sanitized rationale
    q.o.forEach((opt,i)=>{
      const _isCorrect=(i===q.c);
      const _isUserPick=(i===G.sel);
      const _rationale=_dist[i];
      const _bg=_isCorrect?'#dcfce7':(_isUserPick?'#fef2f2':'#fff7ed');
      const _brd=_isCorrect?'#86efac':(_isUserPick?'#fca5a5':'#fed7aa');
      const _mark=_isCorrect?'<b style="color:#059669">✓</b>':'<b style="color:#dc2626">✗</b>';
      const _pickTag=(_isUserPick&&!_isCorrect)?' <span style="color:#64748b;font-size:9px">(הבחירה שלך)</span>':'';
      h+=`<div style="margin-bottom:6px;padding:8px 10px;background:${_bg};border:1px solid ${_brd};border-radius:8px;font-size:11px;line-height:1.6" dir="${heDir((_rationale||'')+' '+opt)}">`;
      h+=`<div style="font-weight:700;margin-bottom:3px">${_mark} <bdi>${sanitize(opt)}</bdi>${_pickTag}</div>`;
      if(_rationale){
        // sanitize first, then style the literal markers. sanitize() cannot introduce
        // HTML, and "Wrong because:" / "Would be correct if:" are literal strings.
        const _formatted=sanitize(_rationale)
          .replace(/Wrong because:/g,'<b style="color:#b91c1c">Wrong because:</b>')
          .replace(/Would be correct if:/g,'<b style="color:#059669">Would be correct if:</b>');
        h+=`<div>${_formatted}</div>`;
      }else if(_isCorrect){
        h+=`<div style="color:#059669;font-size:10px">התשובה הנכונה</div>`;
      }
      h+=`</div>`;
    });
  }else if(_aiTxt){
    // On-demand AI autopsy was cached previously (legacy path) — already sanitized+formatted
    h+=`<div style="font-size:11px;line-height:1.7;color:#1e293b;unicode-bidi:plaintext" dir="${heDir(_aiTxt)}">${_aiTxt}</div>`;
  }else{
    // No offline data yet — auto-trigger AI once, show loading state
    h+=`<div style="font-size:11px;color:#64748b;padding:4px 0">⏳ טוען הסבר על מסיחים...</div>`;
    setTimeout(()=>{ if(!G._exCache['autopsy_'+_qIdx])aiAutopsy(_qIdx); },100);
  }
  h+=`</div>`;
}
h+=`<div style="display:flex;gap:16px;margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8">
<span>✅ ${G.S.qOk}</span><span>❌ ${G.S.qNo}</span><span>📊 ${pct}</span>${G.S.sr[G.pool[G.qi]]?.at?`<span style="color:#94a3b8">⏱${G.S.sr[G.pool[G.qi]].at}s avg</span>`:""}</div>`;
h+=`</div>`;
return h;
}
// Sudden Death check/next
export function sdCheck(){if(G.sel===null)return;G.ans=true;const q=G.QZ[G.sdPool[G.sdQi]];if(G.sel===q.c){G.sdStreak++;G.S.qOk++;srScore(G.sdPool[G.sdQi],true);G.save();G.render();}else{G.S.qNo++;srScore(G.sdPool[G.sdQi],false);G.save();G.render();setTimeout(()=>endSuddenDeath(),800);}}
export function sdNext(){G.sdQi++;if(G.sdQi>=G.sdPool.length)G.sdQi=0;G.sel=null;G.ans=false;G.autopsyDistractor=-1;G.render();}



// Event delegation for Quiz tab — set up once on #ct container
export function initQuizEvents(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    // === Pre-answer ===
    if (action === 'pick') {
      const i = parseInt(el.dataset.i, 10);
      if (G.blindRecall && !G.ans && i !== G.sel) el.classList.remove('qo-blur');
      pick(i);
    }
    else if (action === 'check-answer') { check(); }
    else if (action === 'give-up') { showAnswerHardFail(); }
    else if (action === 'sd-check') { sdCheck(); }
    else if (action === 'sd-next') { sdNext(); }

    // === Post-answer ===
    else if (action === 'next-q') { next(); }
    else if (action === 'prev-q') { prev(); }
    else if (action === 'wrong-reason') {
      G._wrongReason = el.dataset.r; G.save(); G.render();
    }
    else if (action === 'diff-rating') {
      const d = el.dataset.d;
      G._diffRating = d; _storeDiff(G.pool[G.qi], d);
    }
    else if (action === 'read-chapter') {
      G.tab = 'lib'; G.libSec = 'harrison';
      const q = G.QZ[G.pool[G.qi]];
      const chRef = q ? TOPIC_REF[q.ti] : null;
      if (chRef && chRef.s === 'har' && chRef.ch) {
        openHarrisonChapter(chRef.ch);
      } else {
        G.render();
      }
    }
    else if (action === 'skip-teachback') {
      G.teachBackState = 'skip'; G.render();
    }
    else if (action === 'grade-teachback') {
      const v = document.getElementById('tbInput')?.value?.trim();
      if (v) { gradeTeachBack(G.pool[G.qi], v); }
      else { G.teachBackState = 'skip'; G.render(); }
    }
    else if (action === 'voice-teachback') { startVoiceTeachBack(); }
    else if (action === 'ai-explain') {
      explainWithAI(parseInt(el.dataset.idx, 10));
    }
    else if (action === 'ai-autopsy') { aiAutopsy(G.pool[G.qi]); }

    // === Mode controls ===
    else if (action === 'quit-sd') { endSuddenDeath(); }
    else if (action === 'pause-timed') { pauseTimed(); }
    else if (action === 'stop-pomo') { stopPomodoro(); }
    else if (action === 'start-exam') { startExam(); }
    else if (action === 'start-mock') { showMockExamPicker(); }
    else if (action === 'mock-picker-noop') { /* stop propagation so card clicks don't close modal */ }
    else if (action === 'start-mock-mixed') { document.getElementById('mockPicker')?.remove(); startMockExam(); }
    else if (action === 'start-mock-tag') { const tag=el.dataset.tag; document.getElementById('mockPicker')?.remove(); if(tag)startMockExamByTag(tag); }
    else if (action === 'close-mock-picker') { if(el.id==='mockPicker')document.getElementById('mockPicker')?.remove(); }
    else if (action === 'start-sd') { startSuddenDeath(); }
    else if (action === 'start-oncall') { startOnCallMode(); }
    else if (action === 'start-pomo') { startPomodoro(); }
    else if (action === 'start-mini-exam') {
      startTopicMiniExam(parseInt(el.dataset.ti, 10));
    }

    // === Filters ===
    else if (action === 'filter') { setFilt(el.dataset.f); }
    else if (action === 'filter-year') { toggleYearFilt(el.dataset.f); }
    else if (action === 'filter-year-clear') { clearYearFilt(); }
    else if (action === 'filter-rescue') { buildRescuePool(); }
    else if (action === 'filter-nbs') { startNextBestStep(); }

    // === Toggles ===
    else if (action === 'toggle-bk') { toggleBk(); }
    else if (action === 'toggle-qnote') { toggleQNote(); }
    else if (action === 'save-qnote') { saveQNote(); }
    else if (action === 'del-qnote') { delQNote(); }
    else if (action === 'cancel-qnote') { const b = document.getElementById('qnote-box'); if (b) b.remove(); }

    // === Image/Media ===
    else if (action === 'view-img') {
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) viewImg(img.src);
    }
    else if (action === 'remove-img') { removeQImage(parseInt(el.dataset.idx, 10)); }
    else if (action === 'mark-e-verified') {
      const idx=parseInt(el.dataset.idx,10);
      if(!isNaN(idx)&&G.QZ[idx]){delete G.QZ[idx].e_issue;G.render();}
    }
    else if (action === 'mark-verified') {
      const idx=parseInt(el.dataset.idx,10);
      if(!isNaN(idx)&&G.QZ[idx]){delete G.QZ[idx].imgDep;G.render();}
    }
    else if (action === 'clear-eflag') {
      const idx=parseInt(el.dataset.idx,10);
      if(!isNaN(idx)&&G.QZ[idx]){delete G.QZ[idx].eFlag;G.render();}
    }
    else if (action === 'upload-img') { uploadQImage(parseInt(el.dataset.idx, 10)); }
    else if (action === 'speak-q') { speakQuestion(); }
    else if (action === 'share-q') { window.shareQ(); }
    else if (action === 'dismiss') { el.parentElement.style.display = 'none'; }

    // === On-call mode ===
    else if (action === 'exit-oncall') { exitOnCallMode(); }
    else if (action === 'flip-card') { flipCard(); }
    else if (action === 'explain-oncall') { runExplainOnCall(parseInt(el.dataset.idx, 10)); }
    else if (action === 'oncall-pick') { onCallPick(el.dataset.correct === 'true'); }

    // === AI explain ===
    else if (action === 'flag-explain') { toggleFlagExplain(parseInt(el.dataset.idx, 10)); }
  });

  container.addEventListener('change', (e) => {
    const action = e.target.dataset?.action;
    if (action === 'toggle-blind') { G.blindRecall = e.target.checked; G.render(); }
    else if (action === 'toggle-autopsy') { G.autopsyMode = e.target.checked; G.render(); }
    else if (action === 'toggle-timed') {
      G.timedMode = e.target.checked;
      if (G.timedMode) { clearInterval(G.timedInt); G.timedSec = 90; G.render(); setTimeout(startTimedQ, 50); }
      else { stopTimedMode(); }
    }
    else if (action === 'topic-select') {
      const v = parseInt(e.target.value, 10);
      if (v === -1 || isNaN(v)) setFilt('all');
      else setTopicFilt(v);
    }
  });
}
