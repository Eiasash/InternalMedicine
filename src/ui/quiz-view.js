import G from '../core/globals.js';
import { SUPA_URL, SUPA_ANON, TOPICS, EXAM_FREQ } from '../core/constants.js';
import { sanitize, fmtT, safeJSONParse, getOptShuffle, remapExplanationLetters, isMetaOption } from '../core/utils.js';
import { getDueQuestions, getWeakTopics, isExamTrap, srScore, getTopicStats } from '../sr/spaced-repetition.js';
import { isChronicFail } from '../sr/fsrs-bridge.js';
import { buildPool, check as quizCheck, next as quizNext } from '../quiz/engine.js';

export function toggleBk(){G.S.bk[G.pool[G.qi]]=!G.S.bk[G.pool[G.qi]];G.save();G.render();}


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
<button class="btn" style="background:rgba(255,255,255,.2);color:#fff;font-size:10px;padding:4px 10px" onclick="endSuddenDeath()" aria-label="Quit sudden death mode">Quit</button></div>`;
h+=`<div class="card" style="padding:16px">`;
if(G.timedMode&&!G.ans){
  h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
<span id="timed-count" style="font-size:11px;font-weight:700;color:#64748b;min-width:24px">${G.timedSec}s</span>
<div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
  <div id="timed-bar" style="height:100%;width:${Math.round(G.timedSec/90*100)}%;background:${G.timedSec>45?'#10b981':G.timedSec>22?'#f59e0b':'#ef4444'};border-radius:3px;transition:width .9s linear"></div>
</div>
<button onclick="pauseTimed()" style="font-size:9px;padding:2px 7px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;white-space:nowrap" aria-label="${timedPaused?'Resume timer':'Pause timer'}">${timedPaused?'▶ המשך':'⏸ עצור'}</button>
</div>`;
}
const _isFlagQ=(G.S.flagged||{})[G.pool[G.qi]];
h+=`<p class="heb" style="font-size:13px;font-weight:700;line-height:1.7;margin-bottom:${q.img?'10':'16'}px">${_isFlagQ?'<span style="color:#dc2626;font-size:11px" title="Explanation flagged — verify">⚑ </span>':''  }${q.q}</p>`;
if(q.img){h+=`<div style="margin-bottom:14px;text-align:center;position:relative"><img src="${q.img}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer" onclick="viewImg(this.src)" loading="lazy"><button onclick="event.stopPropagation();removeQImage(${pool[qi]})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:12px;cursor:pointer">✕</button></div>`;}
if(!q.img&&!G.examMode){h+=`<div style="margin-bottom:10px"><button onclick="uploadQImage(${pool[qi]})" style="font-size:10px;padding:4px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer">📷 Attach Image</button><span id="img-status-${G.pool[G.qi]}" style="font-size:10px;color:#94a3b8;margin-left:6px"></span></div>`;}
q.o.forEach((o,i)=>{
let cls='qo';
if(G.ans){cls+=' lk';if(i===q.c)cls+=' ok';else if(i===G.sel)cls+=' no';else cls+=' dim';}
else if(i===G.sel)cls+=' G.sel';
h+=`<button class="${cls}" onclick="pick(${i})" aria-label="Option ${i+1}: ${o}">${o}</button>`;
});
if(!G.ans)h+=`<button class="btn btn-p" onclick="sdCheck()"${G.sel===null?' disabled':''} aria-label="Check answer">בדוק</button>`;
else h+=`<button class="btn btn-d" onclick="sdNext()" aria-label="Next question">הבאה ←</button>`;
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
<button onclick="stopPomodoro()" style="font-size:10px;color:#dc2626;font-weight:600" aria-label="Stop pomodoro timer">Stop</button></div>`:'';
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
<button onclick="startExam()" class="btn btn-d" style="font-size:10px;padding:5px 12px" aria-label="Start exam with 150 questions">📋 Exam (150q)</button><button onclick="startMockExam()" class="btn btn-d" style="font-size:10px;padding:5px 12px;background:#7c3aed;color:#fff" aria-label="Start mock exam with 100 questions">🎯 Mock (100q)</button>
<span class="tt-wrap"><button onclick="startSuddenDeath()" class="btn" style="font-size:10px;padding:5px 12px;background:#fef2f2;color:#dc2626" aria-label="Start sudden death mode">💀 Sudden Death</button><button onclick="startOnCallMode()" class="btn" style="font-size:10px;padding:5px 12px;background:#0f172a;color:#7dd3fc" aria-label="Start on-call mode">🌙 On-call</button><button class="tt-icon" tabindex="0" aria-label="Info about sudden death mode">ⓘ</button><div class="tt-box">One wrong answer ends the session. Builds high-stakes exam pressure.</div></span>
${!G.pomoActive?'<span class="tt-wrap"><button onclick="startPomodoro()" class="btn" style="font-size:10px;padding:5px 12px;background:#ecfdf5;color:#059669" aria-label="Start pomodoro timer">⏱️ Pomodoro</button><button class="tt-icon" tabindex="0" aria-label="Info about pomodoro timer">ⓘ</button><div class="tt-box">25min focus / 5min break study timer. Helps maintain concentration.</div></span>':''}
</div>
</div>`;
h+=`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">`;
const _trapCount=G.QZ.filter((_,i)=>isExamTrap(i)).length;
const _aiCount=G.QZ.filter(q=>q.t==='Harrison').length;
const filts=[['all',`הכל (${G.QZ.length})`],['2020','20'],['Jun21','Jun21'],['Jun22','Jun22'],['Jun23','Jun23'],['May24','May24'],['Oct24','Oct24'],['Jun25','Jun25'],['Harrison',`🤖 AI (${_aiCount})`],['hard','🔥 Hard'],['slow','⏱️ Slow'],['weak','🎯 Weak'],['due','🔄 Due'],['traps',`🪤 Traps (${_trapCount})`],['nbs','🎯 Next Best Step']];
// Rescue Drill pill
const _weakForPill=getWeakTopics(3);
if(_weakForPill.length&&_weakForPill[0].pct!==null&&_weakForPill[0].pct<65)filts.push(['rescue','🚨 Rescue']);
if(dueN>0)filts.push(['due',`🔄 Due (${dueN})`]);
filts.forEach(([f,l])=>{
if(f==='rescue')h+=`<span class="pill ${G.filt==='rescue'?'on':''}" onclick="buildRescuePool()">${l}</span>`;
else if(f==='nbs')h+=`<span class="pill ${G.filt==='nbs'?'on':''}" onclick="startNextBestStep()">${l}</span>`;
else h+=`<span class="pill ${G.filt===f&&G.filt!=='topic'?'on':''}" onclick="setFilt('${f}')">${l}</span>`;
});
h+=`</div>`;
// Blind recall & Distractor Autopsy toggles
h+=`<div style="display:flex;gap:8px;margin-bottom:10px;font-size:10px">
<span class="tt-wrap"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${G.blindRecall?'checked':''} onchange="blindRecall=this.checked;G.render()"> 🙈 Cover Options</label><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">Hides answer choices — forces you to recall the answer before seeing options.</div></span>
<span class="tt-wrap"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${G.autopsyMode?'checked':''} onchange="autopsyMode=this.checked;G.render()"> 🔬 Distractor Autopsy</label><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">After answering, explains WHY each wrong option is wrong — builds distractor recognition skill.</div></span>
<span class="tt-wrap"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${G.timedMode?'checked':''} onchange="timedMode=this.checked;if(timedMode){clearInterval(timedInt);timedSec=90;G.render();setTimeout(startTimedQ,50);}else{stopTimedMode();}"> ⏱ Timed (90s)</label><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">90-second countdown per question. Auto-advances when time runs out — marks as wrong. Builds exam-condition reflexes.</div></span>
</div>`;
h+=`<div style="display:flex;gap:6px;margin-bottom:10px"><select class="calc-in" style="font-size:11px;padding:6px 10px;flex:1" onchange="this.value===-1?setFilt('all'):setTopicFilt(parseInt(this.value))">
<option value="-1"${G.filt!=='topic'?' selected':''}>📂 Filter by topic…</option>`;
TOPICS.forEach((t,i)=>{h+=`<option value="${i}"${G.filt==='topic'&&G.topicFilt===i?' selected':''}>${t}</option>`;});
h+=`</select>`;
// Feature 2: Topic mini-exam button
if(G.filt==='topic'&&G.topicFilt>=0){
const _tqCount=G.QZ.filter(q=>q.ti===G.topicFilt).length;
h+=`<button class="btn btn-d" style="font-size:10px;padding:6px 12px;white-space:nowrap" onclick="startTopicMiniExam(${topicFilt})" aria-label="Start topic mini-exam">🎯 Mini Exam (${Math.min(_tqCount,20)}q)</button>`;
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
<button onclick="pauseTimed()" style="font-size:9px;padding:2px 7px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;white-space:nowrap" aria-label="${timedPaused?'Resume timer':'Pause timer'}">${timedPaused?'▶ המשך':'⏸ עצור'}</button>
</div>`;
}
const topicName=q.ti>=0&&TOPICS[q.ti]?TOPICS[q.ti]:'';
const _cf=isChronicFail(G.S.sr[G.pool[G.qi]]);
h+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${_cf?'<span title="Chronic difficulty — read the chapter instead of drilling" style="font-size:14px;cursor:default">🔴</span>':''}${isExamTrap(G.pool[G.qi])?'<span title="Exam trap — many people pick the same wrong answer" style="font-size:12px;cursor:default">🪤</span>':''}<span class="tag-year" style="background:${q.t==='Harrison'?'#faf5ff':'#eff6ff'};color:${q.t==='Harrison'?'#7c3aed':'#1d4ed8'};font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">${q.t==='Harrison'?'🤖 AI — Harrison\'s':'📝 '+q.t}</span>${topicName?`<span class="tag-topic" style="background:#f0fdf4;color:#166534;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px">${topicName}</span>`:''}${(()=>{const ref=TOPIC_REF[q.ti];if(!ref)return '';return '';})()}</div>
<div style="display:flex;align-items:center;gap:8px">
<button onclick="speakQuestion()" class="speech-btn${G.isSpeaking?' speaking':''}" title="Read aloud" aria-label="Read question aloud">🔊</button>
<button onclick="shareQ()" id="shbtn" class="share-btn" title="Share" aria-label="Share question">📋 שתף</button><button onclick="toggleBk()" style="font-size:16px;opacity:${bk?.7:.3};min-height:44px" title="Bookmark" aria-label="${bk?'Remove bookmark':'Bookmark question'}">${bk?'🔖':'🏷️'}</button>
<span style="color:#94a3b8;font-size:10px">${G.qi+1}/${G.pool.length}</span>
</div></div>`;
h+=`<p class="heb" style="font-size:13px;font-weight:700;line-height:1.7;margin-bottom:${q.img?'10':'16'}px" dir="auto">${q.q}</p>`;
if(q.img){h+=`<div style="margin-bottom:14px;text-align:center"><img src="${q.img}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer" onclick="viewImg(this.src)" loading="lazy"></div>`;}
const _shuf=getOptShuffle(G.pool[G.qi],q);
_shuf.forEach((origI,dispJ)=>{
const o=q.o[origI];
let cls='qo';
if(G.ans){cls+=' lk';if(origI===q.c)cls+=' ok';else if(origI===G.sel)cls+=' no';else cls+=' dim';}
else if(origI===G.sel)cls+=' G.sel';
const blurCls=G.blindRecall&&!G.ans&&origI!==G.sel?' qo-blur':'';
const autopsyCls=(G.autopsyMode&&G.ans&&origI!==q.c&&origI===G.autopsyDistractor)?' distractor-highlight':'';
h+=`<button class="${cls}${blurCls}${autopsyCls}" onclick="${blindRecall&&!ans&&origI!==sel?'this.classList.remove(\"qo-blur\");':''}pick(${origI})" aria-label="Option ${origI+1}"><span>${o}</span>${q.oi&&q.oi[origI]?'<img src="'+sanitize(q.oi[origI])+'" style="max-width:100%;max-height:120px;margin-top:6px;border-radius:6px" loading="lazy">':''}</button>`;
});
h+=`<div style="display:flex;gap:6px;margin-top:14px">`;
if(!G.ans){
if(!G.examMode&&G.sel!==null&&G._confidence===null){
// Feature 9: Confidence before reveal
h+=`<div style="margin-bottom:8px;font-size:10px;color:#64748b;font-weight:600">How sure are you?</div>
<div style="display:flex;gap:6px;margin-bottom:10px">
<button class="btn" style="flex:1;background:#fef2f2;color:#dc2626;font-size:13px;padding:8px" onclick="_confidence=0;G.render()">😬</button>
<button class="btn" style="flex:1;background:#fffbeb;color:#d97706;font-size:13px;padding:8px" onclick="_confidence=1;G.render()">🤔</button>
<button class="btn" style="flex:1;background:#f0fdf4;color:#059669;font-size:13px;padding:8px" onclick="_confidence=2;G.render()">😎</button>
</div>`;
}
const _confLabel=G._confidence===0?'😬':G._confidence===1?'🤔':G._confidence===2?'😎':'';
h+=`<button class="btn btn-p" onclick="check()"${G.sel===null||(!G.examMode&&G._confidence===null)?' disabled':''} aria-label="Check answer">${_confLabel} בדוק</button>`;if(!G.examMode)h+=`<button class="btn" onclick="showAnswerHardFail()" style="background:#fff3e0;color:#d97706;font-size:11px;padding:6px 14px;margin-left:6px" aria-label="Show answer">👁 לא יודע</button>`;}
else{
// Feature 1: Why-wrong classification (required after wrong, non-exam)
if(!G.examMode&&G.sel!==q.c&&!G._wrongReason){
h+=`<div style="margin-bottom:8px">
<div style="font-size:10px;font-weight:700;color:#dc2626;margin-bottom:6px">Why did you get it wrong?</div>
<div style="display:flex;gap:4px;flex-wrap:wrap">
<button class="btn" style="font-size:10px;padding:6px 10px;background:#fef2f2;color:#991b1b" onclick="_wrongReason='no_knowledge';G.save();G.render()">📚 Didn't know</button>
<button class="btn" style="font-size:10px;padding:6px 10px;background:#fffbeb;color:#92400e" onclick="_wrongReason='misread';G.save();G.render()">👓 Misread</button>
<button class="btn" style="font-size:10px;padding:6px 10px;background:#eff6ff;color:#1e40af" onclick="_wrongReason='between_2';G.save();G.render()">⚖️ Between 2</button>
<button class="btn" style="font-size:10px;padding:6px 10px;background:#f5f3ff;color:#6d28d9" onclick="_wrongReason='silly';G.save();G.render()">🤦 Silly mistake</button>
</div></div>`;
}
// Feature 4: Cross-link to chapter after wrong answer
if(!G.examMode&&G.sel!==q.c&&q.ti>=0){
const _chRef=TOPIC_REF[q.ti];
if(_chRef&&_chRef.s==='har'){
h+=`<button class="btn" onclick="tab='lib';libSec='harrison';G.render()" style="font-size:10px;padding:5px 12px;background:#ede9fe;color:#7c3aed;margin-bottom:6px;width:100%">📖 Read: ${_chRef.l} — you're weak here</button>`;
}
}
// Feature 7: Optional difficulty rating
if(!G.examMode){
h+=`<div style="display:flex;gap:4px;margin-bottom:8px;align-items:center">
<span style="font-size:9px;color:#94a3b8">Difficulty:</span>
<button class="btn" style="font-size:9px;padding:3px 8px;${G._diffRating==='easy'?'background:#dcfce7;color:#166534':'background:#f8fafc;color:#94a3b8'}" onclick="_diffRating='easy';_storeDiff(pool[qi],'easy')">Easy</button>
<button class="btn" style="font-size:9px;padding:3px 8px;${G._diffRating==='med'?'background:#fef9c3;color:#854d0e':'background:#f8fafc;color:#94a3b8'}" onclick="_diffRating='med';_storeDiff(pool[qi],'med')">Medium</button>
<button class="btn" style="font-size:9px;padding:3px 8px;${G._diffRating==='hard'?'background:#fecaca;color:#991b1b':'background:#f8fafc;color:#94a3b8'}" onclick="_diffRating='hard';_storeDiff(pool[qi],'hard')">Hard</button>
</div>`;
}
// Next button — blocked if wrong + no classification (non-exam)
const _blocked=!G.examMode&&G.sel!==q.c&&!G._wrongReason;
h+=`<button class="btn btn-d" onclick="next()"${_blocked?' disabled':''} aria-label="${G.examMode&&G.qi+1>=150?'Finish exam':'Next question'}">${G.examMode&&G.qi+1>=150?'סיים':'הבאה ←'}</button>`;
}
h+=`</div>`;

// Teach-Back box
if(G.ans&&!G.examMode&&G.sel===q.c){
if(!G.teachBackState){
h+='<div style="margin-top:12px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;padding:12px">';
h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:700;color:#065f46;direction:rtl">🎓 Teach-Back: הסבר מדוע זו התשובה הנכונה</span><button onclick="startVoiceTeachBack()" id="tb-mic-btn" style="font-size:16px;padding:4px 8px;background:#ecfdf5;border:none;border-radius:8px;cursor:pointer" title="הקלט קולי" aria-label="Record voice teach-back">🎙️</button></div>';
h+='<textarea id="tbInput" dir="rtl" style="width:100%;min-height:60px;resize:vertical;font-family:Heebo,sans-serif;border:1px solid #a7f3d0;border-radius:8px;padding:8px;font-size:12px" placeholder="הקלד את ההסבר שלך..." aria-label="Teach-back explanation"></textarea>';
h+='<div style="display:flex;gap:8px;margin-top:8px">';
h+='<button class="btn btn-g" style="flex:1;font-size:11px" onclick="var v=document.getElementById(\'tbInput\')?.value?.trim();if(v){gradeTeachBack(pool[qi],v);}else{teachBackState=\'skip\';G.render();}" aria-label="Grade teach-back with AI">🤖 Grade it</button>';
h+='<button class="btn btn-o" style="font-size:11px" onclick="teachBackState=\'skip\';G.render()" aria-label="Skip teach-back">דלג</button>';
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
  h+='<div style="font-size:11px;line-height:1.7;direction:rtl;text-align:right">'+sanitize(G.teachBackState.feedback)+'</div>';
}
h+='</div>';
}
}
if(G.ans&&!G.examMode){
const note=q.ti>=0&&G.NOTES[q.ti]?G.NOTES[q.ti]:null;
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
h+=`<div style="margin-top:8px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:11px;line-height:1.7;color:#1e40af;direction:rtl;text-align:right">`;
h+=`<div style="font-weight:700;margin-bottom:4px;font-size:10px">📝 הסבר</div>`;
h+=`<div>${remapExplanationLetters(q.e,_shuf).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')}</div>`;
h+=`</div>`;
}
// AI Explain button
if(G.ans&&!G.examMode){
  var _aiIdx=G.pool[G.qi];
  h+='<div id="ai-explain-'+_aiIdx+'" style="margin-top:6px"></div>';
  if(G._exCache[_aiIdx]&&!G._exCache[_aiIdx].err){
    setTimeout(function(){renderExplainBox(_aiIdx);},0);
  } else {
    h+='<button class="btn btn-g" style="width:100%;margin-top:4px;font-size:11px" onclick="explainWithAI('+_aiIdx+')'+'">🤖 הסבר AI ('+(G._exCache[_aiIdx]?'נסה שוב':'קלוד אופוס')+')</button>';
  }
}
// Distractor Autopsy — AI-powered explanation of ALL wrong options
if(G.autopsyMode&&G.ans){
const wrongIdxs=q.o.map((_,i)=>i).filter(i=>i!==q.c);
if(G.autopsyDistractor<0||G.autopsyDistractor===q.c)G.autopsyDistractor=wrongIdxs[Math.floor(Math.random()*wrongIdxs.length)];
const _apKey='autopsy_'+G.pool[G.qi];
h+=`<div style="padding:12px;margin-top:10px;border:2px solid #f59e0b;border-radius:12px;background:#fffbeb">
<div style="font-weight:700;font-size:11px;margin-bottom:6px">🔬 Distractor Autopsy</div>`;
// Check if we have cached AI autopsy
if(G._exCache[_apKey]){
h+=`<div style="font-size:11px;line-height:1.7;color:#1e293b" dir="auto">${G._exCache[_apKey]}</div>`;
} else {
h+=`<div style="font-size:11px;line-height:1.6;color:#92400e" dir="auto">`;
wrongIdxs.forEach(wi=>{
h+=`<div style="margin-bottom:6px"><b style="color:#dc2626">✗ ${q.o[wi]}</b> — <span style="color:#64748b">why wrong here?</span></div>`;
});
h+=`</div>`;
h+=`<button class="btn" style="font-size:10px;background:#fef3c7;color:#92400e;margin-top:6px;width:100%" onclick="aiAutopsy(${pool[qi]})">🤖 AI: Explain why each is wrong</button>`;
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


