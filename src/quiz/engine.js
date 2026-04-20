import G from '../core/globals.js';
import { TOPICS, EXAM_FREQ, EXAM_YEARS } from '../core/constants.js';
import { sanitize, fmtT, toast } from "../core/utils.js";
import { getDueQuestions, getTopicStats, isExamTrap, srScore } from '../sr/spaced-repetition.js';
import { callAI } from '../ai/client.js';
import { buildRescuePool } from '../sr/spaced-repetition.js';
import { aiAutopsy } from '../ai/explain.js';

// Quiz engine — extracted from pnimit-mega.html
// Depends on: G.S, G.save (state.js), G.QZ, TOPICS, EXAM_FREQ (constants.js),
//   getDueQuestions, getTopicStats, isExamTrap, srScore (spaced-repetition.js),
//   sanitize, fmtT, callAI (utils.js/client.js)
// References at runtime: G.render, G._exCache, aiAutopsy, G.teachBackState (main script)

// ===== QUIZ ENGINE =====
// Session tracking for end-of-session summary
// Mock exam pacing
// ===== FEATURES: Confidence, Wrong-Reason, Difficulty =====
// Feature 3: Exam trap detection — questions where >40% pick same wrong distractor





export function buildPool(){
// Defensive: if data hasn't loaded yet (or load failed), return empty pool
// rather than crashing in one of the filter branches below.
if(!Array.isArray(G.QZ)||G.QZ.length===0){G.pool=[];G.qi=0;G.sel=null;G.ans=false;return;}
if(G.filt==='traps'){
G.pool=G.QZ.map((_,i)=>i).filter(i=>isExamTrap(i));
for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}
G.qi=0;G.sel=null;G.ans=false;return;
}
if(G.filt==='rescue'){return;} // rescue G.pool already built by buildRescuePool()
if(G.filt==='weak'){
const ts=getTopicStats();
const weakTopics=TOPICS.map((_,i)=>({i,s:ts[i]||{ok:0,no:0,tot:0}})).filter(p=>p.s.tot>=3).sort((a,b)=>{const pa=a.s.tot?a.s.ok/a.s.tot:0,pb=b.s.tot?b.s.ok/b.s.tot:0;return pa-pb;}).slice(0,10).map(p=>p.i);
if(weakTopics.length===0){G.pool=G.QZ.map((_,i)=>i);}else{G.pool=G.QZ.map((_,i)=>i).filter(i=>weakTopics.includes(G.QZ[i].ti));}
for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}
G.qi=0;return;}
if(G.filt==='due'){G.pool=getDueQuestions();G.qi=0;return;}
if(G.filt==='hard'){
// Any question you've interacted with that isn't at default EF (2.5 = never wrong)
G.pool=G.QZ.map((_,i)=>i).filter(i=>{const s=G.S.sr[i];return s&&s.ef<2.5;});
G.pool.sort((a,b)=>(G.S.sr[a]?.ef||2.5)-(G.S.sr[b]?.ef||2.5));
if(!G.pool.length){
// Fallback: any question with SR data at all
G.pool=G.QZ.map((_,i)=>i).filter(i=>G.S.sr[i]);
G.pool.sort((a,b)=>(G.S.sr[a]?.ef||2.5)-(G.S.sr[b]?.ef||2.5));
}
G.qi=0;G.sel=null;G.ans=false;return;}
if(G.filt==='slow'){
G.pool=G.QZ.map((_,i)=>i).filter(i=>{const s=G.S.sr[i];return s&&s.at&&s.at>60;});
G.pool.sort((a,b)=>(G.S.sr[b]?.at||0)-(G.S.sr[a]?.at||0));
G.qi=0;G.sel=null;G.ans=false;return;}

G.pool=[];
const due=getDueQuestions();
let smartShuffled=false;
if(G.filt==='due'){G.pool=due.length?due:[];}
else if(G.filt==='topic'&&G.topicFilt>=0){G.QZ.forEach((q,i)=>{if(q.ti===G.topicFilt)G.pool.push(i)});}
else if(G.filt==='years'&&Array.isArray(G.years)&&G.years.length){
  G.QZ.forEach((q,i)=>{if(G.years.some(y=>q.t&&q.t.includes(y)))G.pool.push(i)});
}
else{
  G.QZ.forEach((q,i)=>{if(G.filt==='all'||q.t.includes(G.filt))G.pool.push(i)});
  if(G.filt==='all'){
    // Smart shuffle: prioritize struggling questions over pure random
    const due=new Set(getDueQuestions());
    const tier1=[],tier2=[],tier3=[],tier4=[];
    G.pool.forEach(i=>{
      const s=G.S.sr[i];
      if(due.has(i))tier1.push(i);
      // FSRS difficulty: D>7=hard struggle, D>4=imperfect (D=1 easy, D=10 hard)
      else if(s&&(s.fsrsD>7||(s.fsrsD===undefined&&s.ef<1.8)))tier2.push(i);
      else if(s&&(s.fsrsD>4||(s.fsrsD===undefined&&s.ef<2.2)))tier3.push(i);
      else tier4.push(i);
    });
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    G.pool=[...shuffle(tier1),...shuffle(tier2),...shuffle(tier3),...shuffle(tier4)];
    smartShuffled=true;
  }
}
if(!smartShuffled){for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}}
G.qi=0;G.sel=null;G.ans=false;
}
// Deferred: buildPool called after data loads

// Feature 2: Topic-locked mini-exam
export function startTopicMiniExam(ti){
G.miniExamTopic=ti;G.miniExamResults=null;
G.pool=G.QZ.map((_,i)=>i).filter(i=>G.QZ[i].ti===ti);
for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}
G.pool=G.pool.slice(0,20);
G.qi=0;G.sel=null;G.ans=false;G._sessionOk=0;G._sessionNo=0;G._sessionStart=Date.now();
G.examMode=true;G.examSec=1800;G.filt='topic';G.topicFilt=ti;
if(G.examTimer)clearInterval(G.examTimer);
G.examTimer=setInterval(()=>{G.examSec--;if(G.examSec<=0){clearInterval(G.examTimer);endMiniExam();}
const el=document.getElementById('etimer');if(el)el.textContent=fmtT(G.examSec);},1000);
G.render();
}
export function endMiniExam(){
clearInterval(G.examTimer);G.examTimer=null;G.examMode=false;
const tot=G._sessionOk+G._sessionNo;const pct=tot?Math.round(G._sessionOk/tot*100):0;
const topicName=TOPICS[G.miniExamTopic]||'Topic';
toast('🎯 Mini Exam: '+topicName+'\n'+pct+'% ('+G._sessionOk+'/'+tot+')\n'+(pct>=70?'Great!':pct>=50?'Getting there':'Needs more work'),'info');
G.miniExamTopic=-1;G.render();
}
export function setFilt(f){
  G.filt=f;G.topicFilt=-1;
  // Clear multi-year selection unless user is toggling within the year group
  if(f!=='years')G.years=[];
  buildPool();G.render();
}
export function setTopicFilt(ti){G.filt='topic';G.topicFilt=ti;G.years=[];buildPool();G.render()}

// Multi-select exam-year filter — toggle a year on/off; empty set falls back to "all"
export function toggleYearFilt(year){
  if(!Array.isArray(G.years))G.years=[];
  // Restrict to known exam-year tokens
  if(!EXAM_YEARS.includes(year))return;
  const idx=G.years.indexOf(year);
  if(idx>=0)G.years.splice(idx,1);else G.years.push(year);
  G.topicFilt=-1;
  G.filt=G.years.length?'years':'all';
  buildPool();G.render();
}
export function clearYearFilt(){G.years=[];if(G.filt==='years')G.filt='all';buildPool();G.render();}

// ===== ON-CALL FLIP CARD MODE =====
export function startOnCallMode(){G.onCallMode=true;G.flipRevealed=false;G.filt='due';buildPool();if(!G.pool.length){G.filt='weak';buildPool();}if(!G.pool.length){G.filt='all';buildPool();}G.render();}
export function exitOnCallMode(){G.onCallMode=false;G.flipRevealed=false;G.render();}
export function flipCard(){G.flipRevealed=true;G.render();}
export function onCallPick(correct){
  G.sel=correct?G.QZ[G.pool[G.qi]].c:((G.QZ[G.pool[G.qi]].c+1)%G.QZ[G.pool[G.qi]].o.length);
  checkMockIntercept();G.ans=true;
  const q=G.QZ[G.pool[G.qi]];
  if(correct){G.S.qOk++;srScore(G.pool[G.qi],true);}
  else{G.S.qNo++;srScore(G.pool[G.qi],false);}
  G.save();
  setTimeout(()=>{
    G.qi++;if(G.qi>=G.pool.length)G.qi=0;
    G.sel=null;G.ans=false;G.flipRevealed=false;G.autopsyDistractor=-1;G.teachBackState=null;
    G.render();
  },600);
}
export function renderOnCall(){
  if(!G.pool.length)return '<div style="padding:40px;text-align:center;color:#94a3b8">No questions available</div>';
  const qIdx=G.pool[G.qi];const q=G.QZ[qIdx];
  const TOPICS_L=TOPICS;
  const topic=q.ti>=0?TOPICS_L[q.ti]:'';
  const correct=q.o[q.c];
  let h='<div style="min-height:100vh;padding:16px;display:flex;flex-direction:column;gap:12px">';
  // Header
  h+=`<div style="display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#64748b">${G.qi+1}/${G.pool.length} · ${G.filt}</div>
    <button data-action="exit-oncall" style="font-size:11px;padding:4px 10px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer" aria-label="Exit on-call mode">✕ Exit</button>
  </div>`;
  // Topic tag
  if(topic)h+=`<div style="font-size:10px;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;display:inline-block;align-self:flex-start;font-weight:600">${topic}</div>`;
  // Question card - large text
  h+=`<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08);flex:1;cursor:${G.flipRevealed?'default':'pointer'}" ${G.flipRevealed?'':'data-action="flip-card" role="button" tabindex="0" aria-label="Flip card to reveal answer"'}>
    <div style="font-size:16px;line-height:1.6;font-weight:500;direction:rtl;text-align:right;margin-bottom:${G.flipRevealed?'16px':'0'}">${q.q}</div>`;
  if(!G.flipRevealed){
    h+=`<div style="text-align:center;margin-top:20px;color:#94a3b8;font-size:13px">👆 tap to reveal answer</div>`;
  } else {
    // Show correct answer prominently
    h+=`<div style="background:#dcfce7;border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:10px;color:#166534;font-weight:700;margin-bottom:6px">✓ CORRECT ANSWER</div>
      <div style="font-size:14px;font-weight:600;direction:rtl;text-align:right">${correct}</div>
    </div>`;
    // Explanation if available
    const ex=G._exCache&&G._exCache[qIdx];
    if(ex){h+=`<div style="font-size:12px;color:#475569;line-height:1.7;direction:rtl;text-align:right;border-top:1px solid #e2e8f0;padding-top:10px">${ex}</div>`;}
    else{h+=`<button data-action="explain-oncall" data-idx="${qIdx}" id="oc-exp-${qIdx}" style="font-size:11px;padding:5px 12px;background:#eff6ff;color:#3b82f6;border:none;border-radius:8px;cursor:pointer;margin-bottom:8px">🤖 הסבר AI</button><div id="oc-exp-box-${qIdx}"></div>`;}
  }
  h+=`</div>`;
  // Rate buttons (only after flip)
  if(G.flipRevealed){
    h+=`<div style="display:flex;gap:12px">
      <button data-action="oncall-pick" data-correct="false" style="flex:1;padding:18px;background:#fef2f2;color:#dc2626;border:none;border-radius:16px;font-size:28px;font-weight:700;cursor:pointer;min-height:64px" aria-label="Wrong answer">✗</button>
      <button data-action="oncall-pick" data-correct="true" style="flex:1;padding:18px;background:#f0fdf4;color:#16a34a;border:none;border-radius:16px;font-size:28px;font-weight:700;cursor:pointer;min-height:64px" aria-label="Correct answer">✓</button>
    </div>`;
  }
  h+=`</div>`;
  return h;
}
export async function runExplainOnCall(qIdx){
  const btn=document.getElementById('oc-exp-'+qIdx);
  const box=document.getElementById('oc-exp-box-'+qIdx);
  if(!btn||!box)return;
  btn.textContent='⏳ ...';btn.disabled=true;
  const q=G.QZ[qIdx];const correct=q.o[q.c];
  try{
    const txt=await callAI([{role:'user',content:'ANSWER KEY: The correct answer is DEFINITIVELY "'+correct+'".\n\nהסבר בעברית (3-4 משפטים) למה זו התשובה הנכונה. עגן בתשובה הנכונה. שאלה: '+q.q+'\nתשובה נכונה: '+correct}],400,'sonnet');
    G._exCache[qIdx]=txt;try{localStorage.setItem('pnimit_ex',JSON.stringify(G._exCache));}catch(e){}
    box.innerHTML='<div style="font-size:12px;color:#475569;line-height:1.7;direction:rtl;text-align:right;margin-top:8px">'+sanitize(txt)+'</div>';
    btn.remove();
  }catch(e){btn.textContent='🤖 הסבר AI';btn.disabled=false;}
}
export function pick(i){if(G.ans)return;G.sel=i;G.render()}
export function _storeDiff(qIdx,d){if(!G.S.sr[qIdx])G.S.sr[qIdx]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};G.S.sr[qIdx].diff=d;G.save();}
export function check(){
if(G.sel===null)return;
checkMockIntercept();
if(G.timedMode)clearInterval(G.timedInt);
G.ans=true;
const q=G.QZ[G.pool[G.qi]];
// Feature 9: store confidence in SR data
if(G._confidence!==null){
if(!G.S.sr[G.pool[G.qi]])G.S.sr[G.pool[G.qi]]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
if(!G.S.sr[G.pool[G.qi]].conf)G.S.sr[G.pool[G.qi]].conf={sure_ok:0,sure_no:0,unsure_ok:0,unsure_no:0};
const _ck=(G._confidence>=2?'sure':'unsure')+'_'+(G.sel===q.c?'ok':'no');
G.S.sr[G.pool[G.qi]].conf[_ck]++;
}
if(G.sel===q.c){G.S.qOk++;srScore(G.pool[G.qi],true);}
else{G.S.qNo++;
  // Store which distractor was chosen for future mistake-pattern analysis
  if(!G.S.sr[G.pool[G.qi]])G.S.sr[G.pool[G.qi]]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
  if(!G.S.sr[G.pool[G.qi]].wc)G.S.sr[G.pool[G.qi]].wc={};
  const _wci=String(G.sel);
  G.S.sr[G.pool[G.qi]].wc[_wci]=(G.S.sr[G.pool[G.qi]].wc[_wci]||0)+1;
  srScore(G.pool[G.qi],false);
  // Feature 1: store wrong reason later via onclick
  const _apk='autopsy_'+G.pool[G.qi];
  if(!G._exCache[_apk]){setTimeout(()=>aiAutopsy(G.pool[G.qi]),400);}
}
G.save();G.render();
}
export function next(){
G.qStartTime=Date.now();
if(G.examMode&&G.mockExamResults&&G.qi+1>=G.pool.length){endMockExam();return;}
if(G.examMode&&!G.mockExamResults&&G.qi+1>=Math.min(G.pool.length,150)){endExam();return;}
// Save current answer state for prev() restoration
if(!G._sessAnsw)G._sessAnsw={};
if(G.ans&&!G.examMode)G._sessAnsw[G.pool[G.qi]]={sel:G.sel,ans:true,conf:G._confidence};
G.qi++;if(G.qi>=G.pool.length)G.qi=0;G.sel=null;G.ans=false;G.autopsyDistractor=-1;G.teachBackState=null;G._optShuffle=null;G._confidence=null;G._wrongReason=null;G._diffRating=null;
if(G.timedMode){clearInterval(G.timedInt);G.timedSec=90;G.render();setTimeout(startTimedQ,100);}
else G.render();
}

export function prev(){
if(G.qi<=0||G.examMode)return;
G.qStartTime=Date.now();
if(G.ans)G._sessAnsw=G._sessAnsw||{},G._sessAnsw[G.pool[G.qi]]={sel:G.sel,ans:true,conf:G._confidence};
G.qi--;
const _st=G._sessAnsw&&G._sessAnsw[G.pool[G.qi]];
if(_st){G.sel=_st.sel;G.ans=_st.ans;G._confidence=_st.conf;}
else{G.sel=null;G.ans=false;G._confidence=null;}
G.autopsyDistractor=-1;G.teachBackState=null;G._optShuffle=null;G._wrongReason=null;G._diffRating=null;
if(G.timedMode){clearInterval(G.timedInt);G.timedSec=90;G.render();setTimeout(startTimedQ,100);}
else G.render();
}

// ===== EXAM MODE =====
// Historical topic frequency weights (from 9 real exams, recency-weighted 2× for last 2)
// target 100q: proportional + floor(1) for evergreen topics
export function buildMockExamPool(){
  const total=EXAM_FREQ.reduce((a,b)=>a+b,0);
  const examPool=[];
  // Group G.QZ by topic
  const byTopic={};
  G.QZ.forEach((q,i)=>{const ti=q.ti>=0?q.ti:39;if(!byTopic[ti])byTopic[ti]=[];byTopic[ti].push(i);});
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
export function startExam(){
  // Classic 150q mode (unchanged)
  G.examMode=true;G.filt='all';buildPool();G.pool=G.pool.slice(0,150);
  G._examStartOk=G.S.qOk;G._examStartNo=G.S.qNo;G.examSec=10800;G.mockExamResults=null;G.save();
  G.examTimer=setInterval(()=>{G.examSec--;if(G.examSec<=0)endExam();
  const el=document.getElementById('etimer');if(el)el.textContent=fmtT(G.examSec);},1000);
  G.render();
}
export function startMockExam(){
  // v2: 100q, realistic distribution, per-topic tracking
  G.examMode=true;
  G.pool=buildMockExamPool();
  G.qi=0;G.sel=null;G.ans=false;G.autopsyDistractor=-1;G.teachBackState=null;
  // per-topic tracking: {ok,no} per ti
  G.mockExamResults={byTopic:{},start:Date.now()};
  EXAM_FREQ.forEach((_,ti)=>{G.mockExamResults.byTopic[ti]={ok:0,no:0};});
  G._examStartOk=G.S.qOk;G._examStartNo=G.S.qNo;G.examSec=10800;G.save();
  G.examTimer=setInterval(()=>{G.examSec--;if(G.examSec<=0)endMockExam();
  const el=document.getElementById('etimer');if(el)el.textContent=fmtT(G.examSec);},1000);
  G.render();
}
// Override check() to also record per-topic result when in mockExam
const _origCheck=window.check;
export function checkMockIntercept(){
  if(G.ans||G.sel===null)return;
  const qIdx=G.pool[G.qi];const q=G.QZ[qIdx];const correct=G.sel===q.c;
  if(G.mockExamResults&&q.ti>=0){
    if(correct)G.mockExamResults.byTopic[q.ti].ok++;
    else G.mockExamResults.byTopic[q.ti].no++;
    G._mockAnswered++;
  }
}
export function endExam(){
  clearInterval(G.examTimer);G.examMode=false;
  const examOk=G.S.qOk-(G._examStartOk||0),examNo=G.S.qNo-(G._examStartNo||0);const tot=examOk+examNo,pct=tot?Math.round(examOk/tot*100):0;
  const pass=pct>=60;
  const html=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:16px" id="examModal">
<div style="background:#fff;border-radius:16px;max-width:400px;margin:10vh auto;padding:24px;text-align:center;font-family:Heebo,Inter,sans-serif">
<div style="font-size:48px">${pass?'🎉':'💪'}</div>
<div style="font-size:32px;font-weight:700;color:${pass?'#059669':'#dc2626'}">${pct}%</div>
<div style="font-size:13px;color:#64748b;margin-bottom:8px">${examOk}/${tot} correct · ${fmtT(10800-G.examSec)}</div>
<div style="font-size:15px;font-weight:700;color:${pass?'#059669':'#dc2626'};margin-bottom:16px">${pass?'PASS ✓':'NEEDS WORK ✗'} (pass ≥60%)</div>
<button data-action="close-exam-modal" style="width:100%;padding:12px;background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">סגור</button>
</div></div>`;
  const d=document.createElement('div');d.innerHTML=html;document.body.appendChild(d.firstChild);
  G.render();
}
export function endMockExam(){
  clearInterval(G.examTimer);G.examMode=false;
  if(!G.mockExamResults){G.render();return;}
  // Build analytics
  const examOk=G.S.qOk-(G._examStartOk||0),examNo=G.S.qNo-(G._examStartNo||0);const tot=examOk+examNo,pct=tot?Math.round(examOk/tot*100):0;
  const elapsed=Math.floor((Date.now()-G.mockExamResults.start)/1000);
  // Store in history
  try{const hist=JSON.parse(localStorage.getItem('pnimit_mock_hist')||'[]');
    hist.push({date:new Date().toISOString(),score:pct,correct:examOk,total:tot,elapsed,byTopic:G.mockExamResults.byTopic});
    if(hist.length>20)hist.splice(0,hist.length-20);
    localStorage.setItem('pnimit_mock_hist',JSON.stringify(hist));
  }catch(e){}
  // Show in custom modal instead of alert
  showMockExamResult(pct,examOk,tot,elapsed,G.mockExamResults.byTopic);
  G.mockExamResults=null;
  G.render();
}
export function showMockExamResult(pct,correct,tot,elapsed,byTopic){
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
<button data-action="close-mock-modal" style="margin-top:16px;width:100%;padding:10px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer" aria-label="Close exam results">Close</button>
</div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}



