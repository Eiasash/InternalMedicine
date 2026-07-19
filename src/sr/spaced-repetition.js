import G from '../core/globals.js';
import { fsrsR, fsrsInitNew, fsrsUpdate, fsrsMigrateFromSM2, fsrsIntervalWithDeadline } from './fsrs-bridge.js';

import { toast } from '../core/utils.js';
// Spaced repetition, SRS scoring, activity tracking — extracted from pnimit-mega.html
// Depends on: G.S, G.save (state.js), FSRS functions (shared/fsrs.js), G.QZ (data)
// References globals at runtime: G.pool, G.qi, G.sel, G.ans, G.filt, G.render, G.qStartTime,
//   G._sessionOk, G._sessionNo, G._sessionBest, G._sessionWorse (defined in main script)

// ===== TOPIC STATS =====
export function getTopicStats(){
const st={};
Object.entries(G.S.sr).forEach(([idx,d])=>{
const q=G.QZ[idx];if(!q)return;
const ti=q.ti||0;
if(!st[ti])st[ti]={ok:0,no:0,tot:0};
st[ti].tot++;
if(d.n>0)st[ti].ok++;else st[ti].no++;
});
return st;
}

// ===== SPACED REP =====

// ===== FSRS-4.5 loaded from shared/fsrs.js =====
export function srScore(qIdx,correct,fsrsRating){
if(!G.S.sr[qIdx])G.S.sr[qIdx]={ef:2.5,n:0,next:0,ts:[],at:0,tot:0,ok:0};
const s=G.S.sr[qIdx];
if(s.tot===undefined){s.tot=0;s.ok=0;}
const elapsed=Math.round((Date.now()-G.qStartTime)/1000);
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
// FSRS interval → next review (deadline-aware if examDate set)
const fsrsDays=fsrsIntervalWithDeadline(s.fsrsS,s.fsrsD,rPrev);
s.next=Date.now()+fsrsDays*86400000;
// Keep SM-2 ef/n as proxies for filter compatibility
s.n=correct?s.n+1:0;
// ef mirrors difficulty: D=1→ef=2.5, D=10→ef=1.3
s.ef=Math.round((2.5-(s.fsrsD-1)/(10-1)*(2.5-1.3))*1000)/1000;
// session tracking
G._sessionOk+=correct?1:0;G._sessionNo+=correct?0:1;
if(correct&&G.QZ[qIdx])G._sessionBest[G.QZ[qIdx].ti]=((G._sessionBest[G.QZ[qIdx].ti]||0)+1);
if(!correct&&G.QZ[qIdx])G._sessionWorse[G.QZ[qIdx].ti]=((G._sessionWorse[G.QZ[qIdx].ti]||0)+1);
G.qStartTime=Date.now();
trackDailyActivity();
G.save();
}
// isChronicFail() loaded from shared/fsrs.js
export function getDueQuestions(){
const now=Date.now();
// Most-overdue-first: sort by scheduled `next` ascending BEFORE capping at 20,
// so a review session surfaces the questions that have been due longest.
// (Previously sliced in numeric-index order, which hid older-due items whenever
// more than 20 were due.)
return Object.entries(G.S.sr).filter(([k,v])=>v.next<=now).sort((a,b)=>(a[1].next||0)-(b[1].next||0)).map(([k])=>parseInt(k)).slice(0,20);
}
// True (unbounded) count of due questions. Badges must reflect the real backlog,
// not min(20, ...) — getDueQuestions() caps its POOL at 20 but the COUNT should not.
export function getDueCount(){
const now=Date.now();
return Object.entries(G.S.sr).filter(([k,v])=>v.next<=now).length;
}
// ===== RESCUE DRILL =====
export function getWeakTopics(n=3){
const stats=getTopicStats();
const scored=Object.entries(stats).map(([ti,s])=>({ti:Number(ti),pct:s.tot?Math.round(s.ok/s.tot*100):null,tot:s.tot,ok:s.ok}))
  .filter(s=>s.tot>=3)
  .sort((a,b)=>a.pct-b.pct);
return scored.slice(0,n);
}
export function getStudyStreak(){
if(!G.S.dailyAct)return G.S.streak||0;
let streak=0;
const d=new Date();
for(let i=0;i<365;i++){
  // Read-compatible: a day counts if activity is stored under EITHER the new
  // local key OR the legacy UTC key (getDailyActivity), so no stored streak
  // history is lost during the local-day transition.
  const act=getDailyActivity(d);
  if(act&&act.q>0)streak++;
  else if(i>0)break;
  d.setDate(d.getDate()-1);
}
return streak;
}
export function buildRescuePool(){
const weak=getWeakTopics(3);
if(!weak.length){toast('Not enough data yet \u2014 answer more questions first','info');return;}
const rescueQs=[];
weak.forEach(w=>{
  const topicQs=G.QZ.map((q,i)=>({i,q})).filter(x=>x.q.ti===w.ti);
  topicQs.sort((a,b)=>{
    const sa=G.S.sr[a.i],sb=G.S.sr[b.i];
    const pa=sa&&sa.tot?(sa.ok/sa.tot):0.5;
    const pb=sb&&sb.tot?(sb.ok/sb.tot):0.5;
    return pa-pb;
  });
  rescueQs.push(...topicQs.slice(0,7).map(x=>x.i));
});
for(let i=rescueQs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rescueQs[i],rescueQs[j]]=[rescueQs[j],rescueQs[i]];}
G.pool=rescueQs;G.qi=0;G.sel=null;G.ans=false;
G.filt='rescue';G.render();
}
// ===== ACTIVITY TRACKING =====
// Local calendar day key (YYYY-MM-DD) from the user's wall clock, NOT UTC. The
// day-streak boundary must follow LOCAL midnight so a late-evening study session
// counts for "today" instead of rolling into the next UTC day.
function localDayKey(ts){
const d=ts==null?new Date():new Date(ts);
const y=d.getFullYear();
const m=String(d.getMonth()+1).padStart(2,'0');
const day=String(d.getDate()).padStart(2,'0');
return y+'-'+m+'-'+day;
}
// Read-compatible day-activity lookup (2026-07-19 local-day transition). Activity
// is WRITTEN under the LOCAL day key going forward, but entries recorded by
// earlier builds use the legacy UTC (toISOString) key. Accept BOTH keys for a
// given calendar day so existing stored history still counts — a NON-destructive
// transition: legacy keys are read, never renamed or deleted. Returns the
// activity record (or null); callers gate on `.q>0`.
export function getDailyActivity(dateOrTs){
if(!G.S.dailyAct)return null;
const d=dateOrTs==null?new Date():(dateOrTs instanceof Date?dateOrTs:new Date(dateOrTs));
const localKey=localDayKey(d.getTime());
const utcKey=d.toISOString().slice(0,10);
return G.S.dailyAct[localKey]||G.S.dailyAct[utcKey]||null;
}
// 2026-07-18 streak fix: advance the day-streak ONLY for a REAL study day.
// Called from trackDailyActivity() (i.e. when a question is actually answered),
// so merely opening the app can no longer inflate the streak. Idempotent within
// a local day. G.S.streak is backed up and submitted to the leaderboard, so it
// must track genuine activity on LOCAL days. This replaces the app-open
// updateStreak IIFE in src/core/state.js, which bumped G.S.streak on the first
// save() of each UTC calendar day regardless of whether the user studied.
export function advanceStudyStreak(nowMs){
const now=nowMs==null?Date.now():nowMs;
const today=localDayKey(now);
if(G.S.lastDay===today)return; // a study day is already counted for today
const yest=localDayKey(now-86400000);
G.S.streak=(G.S.lastDay===yest)?((G.S.streak||0)+1):1;
G.S.lastDay=today;
}
export function trackDailyActivity(){
if(!G.S.dailyAct)G.S.dailyAct={};
// 2026-07-19: write the activity day under the LOCAL calendar key (was UTC
// toISOString), so the calendar + streak day-boundary is fully local-consistent
// with advanceStudyStreak(). Reads accept BOTH the local and legacy UTC key
// (getDailyActivity), so pre-existing UTC-keyed history is preserved — this is a
// read-compatible transition, not a destructive migration.
const today=localDayKey();
if(!G.S.dailyAct[today])G.S.dailyAct[today]={q:0,ok:0};
G.S.dailyAct[today].q++;
const keys=Object.keys(G.S.dailyAct).sort();
while(keys.length>90){delete G.S.dailyAct[keys.shift()];}
// 2026-07-18: advance the leaderboard/backup streak ONLY on real activity.
advanceStudyStreak();
}
// ===== SPACED READING TRACKER =====
export function trackChapterRead(source,ch){
if(!G.S.chReads)G.S.chReads={};
const key=source+'_'+ch;
G.S.chReads[key]=Date.now();
G.save();
}
export function getChaptersDueForReading(source,dayThreshold=30){
if(!G.S.chReads)return[];
const now=Date.now();
const due=[];
Object.entries(G.S.chReads).forEach(([key,ts])=>{
  if(!key.startsWith(source+'_'))return;
  const ch=key.split('_')[1];
  const daysSince=Math.floor((now-ts)/86400000);
  if(daysSince>=dayThreshold)due.push({ch,daysSince,ts});
});
return due.sort((a,b)=>b.daysSince-a.daysSince);
}


// ===== EXAM TRAP DETECTION =====
export function isExamTrap(qIdx){
const s=G.S.sr[qIdx];if(!s||!s.wc)return false;
const totalAttempts=s.tot||0;if(totalAttempts<3)return false;
const maxWrong=Math.max(...Object.values(s.wc));
return maxWrong/totalAttempts>=0.4;
}
