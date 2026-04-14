// Quiz engine — extracted from pnimit-mega.html
// Depends on: S, save (state.js), QZ, TOPICS, EXAM_FREQ (constants.js),
//   getDueQuestions, getTopicStats, isExamTrap, srScore (spaced-repetition.js),
//   sanitize, fmtT, callAI (utils.js/client.js)
// References at runtime: render, _exCache, aiAutopsy, teachBackState (main script)

// ===== QUIZ ENGINE =====
let qi=0,sel=null,ans=false,pool=[],filt='all',topicFilt=-1,examMode=false,examTimer=null,examSec=0;
let onCallMode=false,flipRevealed=false;
let timedMode=false,timedSec=90,timedInt=null,timedPaused=false;
let _optShuffle=null; // {map:[shuffled indices], qIdx} — shuffle per question
// Session tracking for end-of-session summary
let _sessionOk=0,_sessionNo=0,_sessionBest={},_sessionWorse={},_sessionStart=Date.now();
let _sessionSaved=false;
// Mock exam pacing
let _mockAnswered=0;
let qStartTime=Date.now();
// ===== FEATURES: Confidence, Wrong-Reason, Difficulty =====
let _confidence=null; // null,0(unsure),1(maybe),2(confident)
let _wrongReason=null; // null until classified after wrong answer
let _diffRating=null; // null,'easy','med','hard'
// Feature 3: Exam trap detection — questions where >40% pick same wrong distractor





function buildPool(){
if(filt==='traps'){
pool=QZ.map((_,i)=>i).filter(i=>isExamTrap(i));
for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
qi=0;sel=null;ans=false;return;
}
if(filt==='rescue'){return;} // rescue pool already built by buildRescuePool()
if(filt==='weak'){
const ts=getTopicStats();
const weakTopics=TOPICS.map((_,i)=>({i,s:ts[i]||{ok:0,no:0,tot:0}})).filter(p=>p.s.tot>=3).sort((a,b)=>{const pa=a.s.tot?a.s.ok/a.s.tot:0,pb=b.s.tot?b.s.ok/b.s.tot:0;return pa-pb;}).slice(0,10).map(p=>p.i);
if(weakTopics.length===0){pool=QZ.map((_,i)=>i);}else{pool=QZ.map((_,i)=>i).filter(i=>weakTopics.includes(QZ[i].ti));}
for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
qi=0;return;}
if(filt==='due'){pool=getDueQuestions();qi=0;return;}
if(filt==='hard'){
// Any question you've interacted with that isn't at default EF (2.5 = never wrong)
pool=QZ.map((_,i)=>i).filter(i=>{const s=S.sr[i];return s&&s.ef<2.5;});
pool.sort((a,b)=>(S.sr[a]?.ef||2.5)-(S.sr[b]?.ef||2.5));
if(!pool.length){
// Fallback: any question with SR data at all
pool=QZ.map((_,i)=>i).filter(i=>S.sr[i]);
pool.sort((a,b)=>(S.sr[a]?.ef||2.5)-(S.sr[b]?.ef||2.5));
}
qi=0;sel=null;ans=false;return;}
if(filt==='slow'){
pool=QZ.map((_,i)=>i).filter(i=>{const s=S.sr[i];return s&&s.at&&s.at>60;});
pool.sort((a,b)=>(S.sr[b]?.at||0)-(S.sr[a]?.at||0));
qi=0;sel=null;ans=false;return;}

pool=[];
const due=getDueQuestions();
let smartShuffled=false;
if(filt==='due'){pool=due.length?due:[];}
else if(filt==='topic'&&topicFilt>=0){QZ.forEach((q,i)=>{if(q.ti===topicFilt)pool.push(i)});}
else{
  QZ.forEach((q,i)=>{if(filt==='all'||q.t.includes(filt))pool.push(i)});
  if(filt==='all'){
    // Smart shuffle: prioritize struggling questions over pure random
    const due=new Set(getDueQuestions());
    const tier1=[],tier2=[],tier3=[],tier4=[];
    pool.forEach(i=>{
      const s=S.sr[i];
      if(due.has(i))tier1.push(i);
      // FSRS difficulty: D>7=hard struggle, D>4=imperfect (D=1 easy, D=10 hard)
      else if(s&&(s.fsrsD>7||(s.fsrsD===undefined&&s.ef<1.8)))tier2.push(i);
      else if(s&&(s.fsrsD>4||(s.fsrsD===undefined&&s.ef<2.2)))tier3.push(i);
      else tier4.push(i);
    });
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    pool=[...shuffle(tier1),...shuffle(tier2),...shuffle(tier3),...shuffle(tier4)];
    smartShuffled=true;
  }
}
if(!smartShuffled){for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}}
qi=0;sel=null;ans=false;
}
if(QZ.length)buildPool();

// Feature 2: Topic-locked mini-exam
let miniExamTopic=-1,miniExamResults=null;
function startTopicMiniExam(ti){
miniExamTopic=ti;miniExamResults=null;
pool=QZ.map((_,i)=>i).filter(i=>QZ[i].ti===ti);
for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
pool=pool.slice(0,20);
qi=0;sel=null;ans=false;_sessionOk=0;_sessionNo=0;_sessionStart=Date.now();
examMode=true;examSec=1800;filt='topic';topicFilt=ti;
if(examTimer)clearInterval(examTimer);
examTimer=setInterval(()=>{examSec--;if(examSec<=0){clearInterval(examTimer);endMiniExam();}
const el=document.getElementById('etimer');if(el)el.textContent=fmtT(examSec);},1000);
render();
}
function endMiniExam(){
clearInterval(examTimer);examTimer=null;examMode=false;
const tot=_sessionOk+_sessionNo;const pct=tot?Math.round(_sessionOk/tot*100):0;
const topicName=TOPICS[miniExamTopic]||'Topic';
alert('🎯 Mini Exam: '+topicName+'\n\n'+pct+'% ('+_sessionOk+'/'+tot+')\n'+(pct>=70?'Great!':pct>=50?'Getting there':'Needs more work'));
miniExamTopic=-1;render();
}
function setFilt(f){filt=f;topicFilt=-1;buildPool();render()}
function setTopicFilt(ti){filt='topic';topicFilt=ti;buildPool();render()}

// ===== ON-CALL FLIP CARD MODE =====
function startOnCallMode(){onCallMode=true;flipRevealed=false;filt='due';buildPool();if(!pool.length){filt='weak';buildPool();}if(!pool.length){filt='all';buildPool();}render();}
function exitOnCallMode(){onCallMode=false;flipRevealed=false;render();}
function flipCard(){flipRevealed=true;render();}
function onCallPick(correct){
  sel=correct?QZ[pool[qi]].c:((QZ[pool[qi]].c+1)%QZ[pool[qi]].o.length);
  checkMockIntercept();ans=true;
  const q=QZ[pool[qi]];
  if(correct){S.qOk++;srScore(pool[qi],true);}
  else{S.qNo++;srScore(pool[qi],false);}
  save();
  setTimeout(()=>{
    qi++;if(qi>=pool.length)qi=0;
    sel=null;ans=false;flipRevealed=false;autopsyDistractor=-1;teachBackState=null;
    render();
  },600);
}
function renderOnCall(){
  if(!pool.length)return '<div style="padding:40px;text-align:center;color:#94a3b8">No questions available</div>';
  const qIdx=pool[qi];const q=QZ[qIdx];
  const TOPICS_L=TOPICS;
  const topic=q.ti>=0?TOPICS_L[q.ti]:'';
  const correct=q.o[q.c];
  let h='<div style="min-height:100vh;padding:16px;display:flex;flex-direction:column;gap:12px">';
  // Header
  h+=`<div style="display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#64748b">${qi+1}/${pool.length} · ${filt}</div>
    <button onclick="exitOnCallMode()" style="font-size:11px;padding:4px 10px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer" aria-label="Exit on-call mode">✕ Exit</button>
  </div>`;
  // Topic tag
  if(topic)h+=`<div style="font-size:10px;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;display:inline-block;align-self:flex-start;font-weight:600">${topic}</div>`;
  // Question card - large text
  h+=`<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08);flex:1;cursor:${flipRevealed?'default':'pointer'}" ${flipRevealed?'':'onclick="flipCard()" role="button" tabindex="0" aria-label="Flip card to reveal answer"'}>
    <div style="font-size:16px;line-height:1.6;font-weight:500;direction:rtl;text-align:right;margin-bottom:${flipRevealed?'16px':'0'}">${q.q}</div>`;
  if(!flipRevealed){
    h+=`<div style="text-align:center;margin-top:20px;color:#94a3b8;font-size:13px">👆 tap to reveal answer</div>`;
  } else {
    // Show correct answer prominently
    h+=`<div style="background:#dcfce7;border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:10px;color:#166534;font-weight:700;margin-bottom:6px">✓ CORRECT ANSWER</div>
      <div style="font-size:14px;font-weight:600;direction:rtl;text-align:right">${correct}</div>
    </div>`;
    // Explanation if available
    const ex=_exCache&&_exCache[qIdx];
    if(ex){h+=`<div style="font-size:12px;color:#475569;line-height:1.7;direction:rtl;text-align:right;border-top:1px solid #e2e8f0;padding-top:10px">${ex}</div>`;}
    else{h+=`<button onclick="runExplainOnCall(${qIdx})" id="oc-exp-${qIdx}" style="font-size:11px;padding:5px 12px;background:#eff6ff;color:#3b82f6;border:none;border-radius:8px;cursor:pointer;margin-bottom:8px">🤖 הסבר AI</button><div id="oc-exp-box-${qIdx}"></div>`;}
  }
  h+=`</div>`;
  // Rate buttons (only after flip)
  if(flipRevealed){
    h+=`<div style="display:flex;gap:12px">
      <button onclick="onCallPick(false)" style="flex:1;padding:18px;background:#fef2f2;color:#dc2626;border:none;border-radius:16px;font-size:28px;font-weight:700;cursor:pointer;min-height:64px" aria-label="Wrong answer">✗</button>
      <button onclick="onCallPick(true)" style="flex:1;padding:18px;background:#f0fdf4;color:#16a34a;border:none;border-radius:16px;font-size:28px;font-weight:700;cursor:pointer;min-height:64px" aria-label="Correct answer">✓</button>
    </div>`;
  }
  h+=`</div>`;
  return h;
}
async function runExplainOnCall(qIdx){
  const btn=document.getElementById('oc-exp-'+qIdx);
  const box=document.getElementById('oc-exp-box-'+qIdx);
  if(!btn||!box)return;
  btn.textContent='⏳ ...';btn.disabled=true;
  const q=QZ[qIdx];const correct=q.o[q.c];
  try{
    const txt=await callAI([{role:'user',content:'ANSWER KEY: The correct answer is DEFINITIVELY "'+correct+'".\n\nהסבר בעברית (3-4 משפטים) למה זו התשובה הנכונה. עגן בתשובה הנכונה. שאלה: '+q.q+'\nתשובה נכונה: '+correct}],400,'sonnet');
    _exCache[qIdx]=txt;try{localStorage.setItem('pnimit_ex',JSON.stringify(_exCache));}catch(e){}
    box.innerHTML='<div style="font-size:12px;color:#475569;line-height:1.7;direction:rtl;text-align:right;margin-top:8px">'+sanitize(txt)+'</div>';
    btn.remove();
  }catch(e){btn.textContent='🤖 הסבר AI';btn.disabled=false;}
}
function pick(i){if(ans)return;sel=i;render()}
function _storeDiff(qIdx,d){if(!S.sr[qIdx])S.sr[qIdx]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};S.sr[qIdx].diff=d;save();}
function check(){
if(sel===null)return;
checkMockIntercept();
if(timedMode)clearInterval(timedInt);
ans=true;
const q=QZ[pool[qi]];
// Feature 9: store confidence in SR data
if(_confidence!==null){
if(!S.sr[pool[qi]])S.sr[pool[qi]]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
if(!S.sr[pool[qi]].conf)S.sr[pool[qi]].conf={sure_ok:0,sure_no:0,unsure_ok:0,unsure_no:0};
const _ck=(_confidence>=2?'sure':'unsure')+'_'+(sel===q.c?'ok':'no');
S.sr[pool[qi]].conf[_ck]++;
}
if(sel===q.c){S.qOk++;srScore(pool[qi],true);}
else{S.qNo++;
  // Store which distractor was chosen for future mistake-pattern analysis
  if(!S.sr[pool[qi]])S.sr[pool[qi]]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
  if(!S.sr[pool[qi]].wc)S.sr[pool[qi]].wc={};
  const _wci=String(sel);
  S.sr[pool[qi]].wc[_wci]=(S.sr[pool[qi]].wc[_wci]||0)+1;
  srScore(pool[qi],false);
  // Feature 1: store wrong reason later via onclick
  const _apk='autopsy_'+pool[qi];
  if(!_exCache[_apk]){setTimeout(()=>aiAutopsy(pool[qi]),400);}
}
save();render();
}
function next(){
qStartTime=Date.now();
if(examMode&&mockExamResults&&qi+1>=pool.length){endMockExam();return;}
if(examMode&&!mockExamResults&&qi+1>=Math.min(pool.length,150)){endExam();return;}
qi++;if(qi>=pool.length)qi=0;sel=null;ans=false;autopsyDistractor=-1;teachBackState=null;_optShuffle=null;_confidence=null;_wrongReason=null;_diffRating=null;
if(timedMode){clearInterval(timedInt);timedSec=90;render();setTimeout(startTimedQ,100);}
else render();
}

// ===== EXAM MODE =====
// Historical topic frequency weights (from 9 real exams, recency-weighted 2× for last 2)
// target 100q: proportional + floor(1) for evergreen topics
function buildMockExamPool(){
  const total=EXAM_FREQ.reduce((a,b)=>a+b,0);
  const examPool=[];
  // Group QZ by topic
  const byTopic={};
  QZ.forEach((q,i)=>{const ti=q.ti>=0?q.ti:39;if(!byTopic[ti])byTopic[ti]=[];byTopic[ti].push(i);});
  // Compute target per topic
  EXAM_FREQ.forEach((freq,ti)=>{
    if(!freq||!byTopic[ti]||!byTopic[ti].length)return;
    const target=Math.max(1,Math.round(freq/total*100));
    // shuffle that topic's questions, take target count
    const src=[...byTopic[ti]];for(let i=src.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[src[i],src[j]]=[src[j],src[i]];}
    for(let k=0;k<Math.min(target,src.length);k++)examPool.push(src[k]);
  });
  // Trim or pad to ~100
  for(let i=examPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[examPool[i],examPool[j]]=[examPool[j],examPool[i]];}
  return examPool.slice(0,100);
}
let mockExamResults=null; // stores per-topic breakdown
function startExam(){
  // Classic 150q mode (unchanged)
  examMode=true;filt='all';buildPool();pool=pool.slice(0,150);
  S.qOk=0;S.qNo=0;examSec=10800;mockExamResults=null;save();
  examTimer=setInterval(()=>{examSec--;if(examSec<=0)endExam();
  const el=document.getElementById('etimer');if(el)el.textContent=fmtT(examSec);},1000);
  render();
}
function startMockExam(){
  // v2: 100q, realistic distribution, per-topic tracking
  examMode=true;
  pool=buildMockExamPool();
  qi=0;sel=null;ans=false;autopsyDistractor=-1;teachBackState=null;
  // per-topic tracking: {ok,no} per ti
  mockExamResults={byTopic:{},start:Date.now()};
  EXAM_FREQ.forEach((_,ti)=>{mockExamResults.byTopic[ti]={ok:0,no:0};});
  S.qOk=0;S.qNo=0;examSec=10800;save();
  examTimer=setInterval(()=>{examSec--;if(examSec<=0)endMockExam();
  const el=document.getElementById('etimer');if(el)el.textContent=fmtT(examSec);},1000);
  render();
}
// Override check() to also record per-topic result when in mockExam
const _origCheck=window.check;
function checkMockIntercept(){
  if(ans||sel===null)return;
  const qIdx=pool[qi];const q=QZ[qIdx];const correct=sel===q.c;
  if(mockExamResults&&q.ti>=0){
    if(correct)mockExamResults.byTopic[q.ti].ok++;
    else mockExamResults.byTopic[q.ti].no++;
    _mockAnswered++;
  }
}
function endExam(){
  clearInterval(examTimer);examMode=false;
  const tot=S.qOk+S.qNo,pct=tot?Math.round(S.qOk/tot*100):0;
  alert(`Exam Complete!\n\n✅ ${S.qOk}/${tot} (${pct}%)\n${pct>=60?'PASS 🎉':'NEEDS WORK ❌'}\n\nTime: ${fmtT(10800-examSec)}`);
  render();
}
function endMockExam(){
  clearInterval(examTimer);examMode=false;
  if(!mockExamResults){render();return;}
  // Build analytics
  const tot=S.qOk+S.qNo,pct=tot?Math.round(S.qOk/tot*100):0;
  const elapsed=Math.floor((Date.now()-mockExamResults.start)/1000);
  // Store in history
  try{const hist=JSON.parse(localStorage.getItem('pnimit_mock_hist')||'[]');
    hist.push({date:new Date().toISOString(),score:pct,correct:S.qOk,total:tot,elapsed,byTopic:mockExamResults.byTopic});
    if(hist.length>20)hist.splice(0,hist.length-20);
    localStorage.setItem('pnimit_mock_hist',JSON.stringify(hist));
  }catch(e){}
  // Show in custom modal instead of alert
  showMockExamResult(pct,S.qOk,tot,elapsed,mockExamResults.byTopic);
  mockExamResults=null;
  render();
}
function showMockExamResult(pct,correct,tot,elapsed,byTopic){
  const TOPICS_LOCAL=TOPICS;
  const pass=pct>=60;
  // per-topic breakdown sorted by accuracy ascending (worst first)
  const rows=Object.entries(byTopic).map(([ti,s])=>{
    const n=s.ok+s.no;if(!n)return null;
    const acc=Math.round(s.ok/n*100);
    return{ti:+ti,name:TOPICS_LOCAL[+ti]||'Other',ok:s.ok,no:s.no,n,acc};
  }).filter(Boolean).sort((a,b)=>a.acc-b.acc);
  let html=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:16px" id="mexModal">
<div style="background:#fff;border-radius:16px;max-width:480px;margin:0 auto;padding:20px;font-family:Inter,sans-serif">
<div style="text-align:center;margin-bottom:16px">
  <div style="font-size:48px">${pass?'🎉':'💪'}</div>
  <div style="font-size:28px;font-weight:700;color:${pass?'#059669':'#dc2626'}">${pct}%</div>
  <div style="font-size:13px;color:#64748b">${correct}/${tot} correct · ${fmtT(elapsed)}</div>
  <div style="font-size:14px;font-weight:700;margin-top:4px;color:${pass?'#059669':'#dc2626'}">${pass?'PASS ✓':'NEEDS WORK ✗'} (pass ≥60%)</div>
</div>
<div style="font-weight:700;font-size:12px;margin-bottom:8px;color:#475569">TOPIC BREAKDOWN (worst first):</div>
${rows.map(r=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9">
  <div style="font-size:11px;flex:1">${r.name}</div>
  <div style="font-size:10px;color:#64748b">${r.ok}/${r.n}</div>
  <div style="width:60px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
    <div style="width:${r.acc}%;height:100%;background:${r.acc>=70?'#10b981':r.acc>=50?'#f59e0b':'#ef4444'};border-radius:4px"></div>
  </div>
  <div style="font-size:10px;font-weight:700;color:${r.acc>=70?'#059669':r.acc>=50?'#d97706':'#dc2626'};min-width:28px;text-align:right">${r.acc}%</div>
</div>`).join('')}
<button onclick="document.getElementById('mexModal').remove()" style="margin-top:16px;width:100%;padding:10px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer" aria-label="Close exam results">Close</button>
</div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}



