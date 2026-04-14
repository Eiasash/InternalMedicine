// Spaced repetition, SRS scoring, activity tracking — extracted from pnimit-mega.html
// Depends on: S, save (state.js), FSRS functions (shared/fsrs.js), QZ (data)
// References globals at runtime: pool, qi, sel, ans, filt, render, qStartTime,
//   _sessionOk, _sessionNo, _sessionBest, _sessionWorse (defined in main script)

// ===== TOPIC STATS =====
function getTopicStats(){
const st={};
Object.entries(S.sr).forEach(([idx,d])=>{
const q=QZ[idx];if(!q)return;
const ti=q.ti||0;
if(!st[ti])st[ti]={ok:0,no:0,tot:0};
st[ti].tot++;
if(d.n>0)st[ti].ok++;else st[ti].no++;
});
return st;
}

// ===== SPACED REP =====

// ===== FSRS-4.5 loaded from shared/fsrs.js =====
function srScore(qIdx,correct,fsrsRating){
if(!S.sr[qIdx])S.sr[qIdx]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
const s=S.sr[qIdx];
if(s.tot===undefined){s.tot=0;s.ok=0;}
const elapsed=Math.round((Date.now()-qStartTime)/1000);
if(!s.ts)s.ts=[];
s.ts.push(elapsed);if(s.ts.length>10)s.ts.shift();
s.at=Math.round(s.ts.reduce((a,b)=>a+b,0)/s.ts.length);
s.tot++;if(correct)s.ok++;
// FSRS-4.5 scheduling
const rating=fsrsRating||(correct?3:1); // Use explicit rating if provided
const daysSinceReview=s.lastReview?Math.max(0,(Date.now()-s.lastReview)/86400000):0;
// Initialize or migrate FSRS state
if(s.fsrsS===undefined||s.fsrsD===undefined){
  if(s.n>0||s.ef!==2.5){
    const mig=fsrsMigrateFromSM2(s);s.fsrsS=mig.s;s.fsrsD=mig.d;
  }else{
    const init=fsrsInitNew(rating);s.fsrsS=init.s;s.fsrsD=init.d;
  }
}
const rPrev=daysSinceReview>0?fsrsR(daysSinceReview,s.fsrsS):1;
const upd=fsrsUpdate(s.fsrsS,s.fsrsD,rPrev,rating);
s.fsrsS=Math.round(upd.s*1000)/1000;
s.fsrsD=Math.round(upd.d*100)/100;
s.lastReview=Date.now();
// FSRS interval → next review
const fsrsDays=fsrsInterval(s.fsrsS);
s.next=Date.now()+fsrsDays*86400000;
// Keep SM-2 ef/n as proxies for filter compatibility
s.n=correct?s.n+1:0;
// ef mirrors difficulty: D=1→ef=2.5, D=10→ef=1.3
s.ef=Math.round((2.5-(s.fsrsD-1)/(10-1)*(2.5-1.3))*1000)/1000;
// session tracking
_sessionOk+=correct?1:0;_sessionNo+=correct?0:1;
if(correct&&QZ[qIdx])_sessionBest[QZ[qIdx].ti]=((_sessionBest[QZ[qIdx].ti]||0)+1);
if(!correct&&QZ[qIdx])_sessionWorse[QZ[qIdx].ti]=((_sessionWorse[QZ[qIdx].ti]||0)+1);
qStartTime=Date.now();
trackDailyActivity();
save();
}
// isChronicFail() loaded from shared/fsrs.js
function getDueQuestions(){
const now=Date.now();
return Object.entries(S.sr).filter(([k,v])=>v.next<=now).map(([k])=>parseInt(k)).slice(0,20);
}
// ===== RESCUE DRILL =====
function getWeakTopics(n=3){
const stats=getTopicStats();
const scored=Object.entries(stats).map(([ti,s])=>({ti:Number(ti),pct:s.tot?Math.round(s.ok/s.tot*100):null,tot:s.tot,ok:s.ok}))
  .filter(s=>s.tot>=3)
  .sort((a,b)=>a.pct-b.pct);
return scored.slice(0,n);
}
function getStudyStreak(){
if(!S.dailyAct)return S.streak||0;
let streak=0;
const d=new Date();
for(let i=0;i<365;i++){
  const key=d.toISOString().slice(0,10);
  if(S.dailyAct[key]&&S.dailyAct[key].q>0)streak++;
  else if(i>0)break;
  d.setDate(d.getDate()-1);
}
return streak;
}
function buildRescuePool(){
const weak=getWeakTopics(3);
if(!weak.length){alert('Not enough data yet \u2014 answer more questions first');return;}
const rescueQs=[];
weak.forEach(w=>{
  const topicQs=QZ.map((q,i)=>({i,q})).filter(x=>x.q.ti===w.ti);
  topicQs.sort((a,b)=>{
    const sa=S.sr[a.i],sb=S.sr[b.i];
    const pa=sa&&sa.tot?(sa.ok/sa.tot):0.5;
    const pb=sb&&sb.tot?(sb.ok/sb.tot):0.5;
    return pa-pb;
  });
  rescueQs.push(...topicQs.slice(0,7).map(x=>x.i));
});
for(let i=rescueQs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rescueQs[i],rescueQs[j]]=[rescueQs[j],rescueQs[i]];}
pool=rescueQs;qi=0;sel=null;ans=false;
filt='rescue';render();
}
// ===== ACTIVITY TRACKING =====
function trackDailyActivity(){
if(!S.dailyAct)S.dailyAct={};
const today=new Date().toISOString().slice(0,10);
if(!S.dailyAct[today])S.dailyAct[today]={q:0,ok:0};
S.dailyAct[today].q++;
const keys=Object.keys(S.dailyAct).sort();
while(keys.length>90){delete S.dailyAct[keys.shift()];}
}
// ===== SPACED READING TRACKER =====
function trackChapterRead(source,ch){
if(!S.chReads)S.chReads={};
const key=source+'_'+ch;
S.chReads[key]=Date.now();
save();
}
function getChaptersDueForReading(source,dayThreshold=30){
if(!S.chReads)return[];
const now=Date.now();
const due=[];
Object.entries(S.chReads).forEach(([key,ts])=>{
  if(!key.startsWith(source+'_'))return;
  const ch=key.split('_')[1];
  const daysSince=Math.floor((now-ts)/86400000);
  if(daysSince>=dayThreshold)due.push({ch,daysSince,ts});
});
return due.sort((a,b)=>b.daysSince-a.daysSince);
}


// ===== EXAM TRAP DETECTION =====
function isExamTrap(qIdx){
const s=S.sr[qIdx];if(!s||!s.wc)return false;
const totalAttempts=s.tot||0;if(totalAttempts<3)return false;
const maxWrong=Math.max(...Object.values(s.wc));
return maxWrong/totalAttempts>=0.4;
}
