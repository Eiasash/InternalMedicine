import G from '../core/globals.js';
import { TOPICS, EXAM_FREQ, IMA_WEIGHTS, APP_VERSION, HARRISON_PDF_MAP } from '../core/constants.js';
import { sanitize, fmtT, safeJSONParse, getApiKey, setApiKey } from '../core/utils.js';
import { getDueQuestions, getWeakTopics, getStudyStreak, getTopicStats, isExamTrap, getChaptersDueForReading } from '../sr/spaced-repetition.js';
import { isChronicFail } from '../sr/fsrs-bridge.js';
import { renderWrongAnswerLog } from './library-view.js';

function getTopicTrend(ti){
  try{
    const snapshots=JSON.parse(localStorage.getItem('pnimit_weekly')||'{}');
    const keys=Object.keys(snapshots).sort();
    if(keys.length<2)return null;
    const prev=snapshots[keys[keys.length-2]].acc[ti];
    const curr=snapshots[keys[keys.length-1]].acc[ti];
    if(prev===null||curr===null)return null;
    return curr-prev;
  }catch(e){return null;}
}



export function renderPriorityMatrix(){
  const TOPICS_L=TOPICS;
  const EF_FREQ=[50,45,40,30,45,60,50,40,35,50,45,35,55,35,40,30,15,15,20,20,15,15,25,20];
  const maxFreq=Math.max(...EF_FREQ);
  const tSt=G.S.ts||{};
  const rows=TOPICS_L.map((name,ti)=>{
    const s=tSt[ti]||{ok:0,no:0,tot:0};
    const acc=s.tot>0?s.ok/s.tot:null;
    const freq=EF_FREQ[ti]||0;
    const freqPct=maxFreq>0?freq/maxFreq:0;
    const gap=acc===null?0.7:(1-acc); // unknown → treat as 70% gap
    const priority=Math.round(freqPct*gap*100);
    return{ti,name,freq,acc,gap,priority,s};
  }).filter(r=>r.freq>0).sort((a,b)=>b.priority-a.priority);

  let h='<div style="font-weight:700;font-size:12px;margin:14px 0 8px;color:#0f172a">🎯 Priority Matrix — where to study next</div>';
  h+='<div style="font-size:9px;color:#94a3b8;margin-bottom:8px">Score = exam frequency × your gap. Higher = drill harder.</div>';
  rows.slice(0,15).forEach((r,rank)=>{
    const accStr=r.acc===null?'untested':`${Math.round(r.acc*100)}%`;
    const barW=Math.round(r.priority);
    const color=r.priority>=60?'#dc2626':r.priority>=30?'#f59e0b':'#10b981';
    const trend=getTopicTrend(r.ti);
    const trendStr=trend===null?'':trend>5?'<span style="color:#059669;font-size:10px">↑</span>':trend<-5?'<span style="color:#dc2626;font-size:10px">↓</span>':'<span style="color:#94a3b8;font-size:10px">→</span>';
    h+=`<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <div style="font-size:11px;font-weight:${rank<5?'700':'400'}">${rank+1}. ${r.name} ${trendStr}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:9px;color:#64748b">${r.s.tot}q · ${accStr}</span>
          <span style="font-size:10px;font-weight:700;color:${color}">${r.priority}</span>
        </div>
      </div>
      <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
        <div style="width:${barW}%;height:100%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;
  });
  h+=`<div onclick="var el=document.getElementById('pmFull');el.style.display=el.style.display==='none'?'block':'none'" style="font-size:10px;color:rgb(var(--sky));cursor:pointer;margin-top:6px">Show all 24 topics ▾</div>`;
  h+=`<div id="pmFull" style="display:none">`;
  rows.slice(15).forEach((r,rank)=>{
    const accStr=r.acc===null?'untested':`${Math.round(r.acc*100)}%`;
    h+=`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:10px">
      <span>${rank+16}. ${r.name}</span>
      <span style="color:#64748b">${r.s.tot}q · ${accStr}</span>
    </div>`;
  });
  h+=`</div>`;
  return h;
}

// Track view — renderCalc, renderTrack, calcEstScore, study plan, exam trend, cheat sheet, etc.
export function calcUp(k,v){calcVals[k]=parseFloat(v)||0;G.render();}
export function renderCalc(){

let h=`<div class="sec-t">🧮 Clinical Calculators</div><div class="sec-s">CrCl · CHA₂DS₂-VASc · CURB-65 · Wells · PADUA</div>`;

// CrCl
const age=G.calcVals.age||75,wt=G.calcVals.wt||55,cr=G.calcVals.cr||1.0,fem=G.calcVals.fem===undefined?0.85:G.calcVals.fem;
const crcl=Math.max(0,Math.round(((140-age)*wt*fem)/(72*cr)));
h+=`<div class="card" style="padding:14px"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Cockcroft-Gault CrCl</h3>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<div><label style="font-size:10px;color:#64748b">Age</label><input class="calc-in" type="number" value="${age}" onchange="calcUp('age',this.value)"></div>
<div><label style="font-size:10px;color:#64748b">Weight (kg)</label><input class="calc-in" type="number" value="${wt}" onchange="calcUp('wt',this.value)"></div>
<div><label style="font-size:10px;color:#64748b">Creatinine</label><input class="calc-in" type="number" step="0.1" value="${cr}" onchange="calcUp('cr',this.value)"></div>
<div><label style="font-size:10px;color:#64748b">Sex</label><select class="calc-in" onchange="calcUp('fem',this.value)">
<option value="0.85" ${fem<1?'selected':''}>Female (×0.85)</option><option value="1" ${fem>=1?'selected':''}>Male (×1)</option></select></div>
</div>
<div style="margin-top:10px;padding:10px;background:#eff6ff;border-radius:10px;text-align:center">
<span style="font-size:22px;font-weight:700;color:${crcl<30?'#dc2626':crcl<60?'#d97706':'#059669'}">${crcl} ml/min</span>
<p style="font-size:10px;color:#64748b;margin-top:2px">${crcl<30?'CKD 4-5: Avoid metformin, adjust all renally-cleared drugs':crcl<60?'CKD 3: Dose adjust many drugs':'CKD 1-2: Mild impairment'}</p>
</div></div>`;

// CHA2DS2-VASc
const cha=Object.entries(G.calcVals).filter(([k])=>k.startsWith('cha_')).reduce((s,[k,v])=>s+v,0);
h+=`<div class="card" style="padding:14px"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px">CHA₂DS₂-VASc</h3>`;
[['cha_chf','CHF',1],['cha_htn','HTN',1],['cha_age75','Age ≥75',2],['cha_dm','Diabetes',1],
['cha_stroke','Stroke/TIA',2],['cha_vasc','Vascular disease',1],['cha_age65','Age 65-74',1],['cha_sex','Female sex',1]
].forEach(([k,l,pts])=>{
const on=G.calcVals[k]||0;
h+=`<label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc;font-size:11px;cursor:pointer">
<span>${l} (+${pts})</span>
<input type="checkbox" ${on?'checked':''} onchange="calcUp('${k}',this.checked?${pts}:0)" style="width:16px;height:16px">
</label>`;
});
h+=`<div style="margin-top:10px;padding:10px;background:#eff6ff;border-radius:10px;text-align:center">
<span style="font-size:22px;font-weight:700;color:${cha>=2?'#dc2626':'#d97706'}">${cha}</span>
<p style="font-size:10px;color:#64748b;margin-top:2px">${cha>=2?'Anticoagulate (DOAC preferred, Apixaban safest in CKD)':cha===1?'Consider anticoagulation':'Low risk — consider no therapy'}</p>
</div></div>`;


// CURB-65
const curb=Object.entries(G.calcVals).filter(([k])=>k.startsWith('curb_')).reduce((s,[k,v])=>s+v,0);
h+=`<div class="card" style="padding:14px"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px">CURB-65</h3>`;
[['curb_conf','Confusion (new)',1],['curb_bun','BUN >20 mg/dL (>7 mmol/L)',1],['curb_rr','RR ≥30',1],['curb_bp','BP: SBP<90 or DBP≤60',1],['curb_age','Age ≥65',1]
].forEach(([k,l,pts])=>{
const on=G.calcVals[k]||0;
h+=`<label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc;font-size:11px;cursor:pointer">
<span>${l} (+${pts})</span>
<input type="checkbox" ${on?'checked':''} onchange="calcUp('${k}',this.checked?${pts}:0)" style="width:16px;height:16px">
</label>`;
});
const curbRisk=curb<=1?'Low risk (<2% mortality) — consider outpatient':curb===2?'Moderate (9%) — short inpatient or supervised outpatient':'High (15-40%) — ICU if 4-5';
h+=`<div style="margin-top:10px;padding:10px;background:#eff6ff;border-radius:10px;text-align:center">
<span style="font-size:22px;font-weight:700;color:${curb>=3?'#dc2626':curb>=2?'#d97706':'#059669'}">${curb}</span>
<p style="font-size:10px;color:#64748b;margin-top:2px">${curbRisk}</p>
</div></div>`;


// PADUA VTE Score
const paduaItems=[
['pad_cancer','Active cancer',3],['pad_vte','Previous VTE',3],['pad_immob','Reduced mobility (≥3 days)',3],
['pad_throm','Known thrombophilia',3],['pad_trauma','Recent (≤1mo) trauma/surgery',2],
['pad_age','Age ≥70',1],['pad_hf','Heart/respiratory failure',1],['pad_mi','Acute MI or stroke',1],
['pad_infect','Acute infection/rheumatic disorder',1],['pad_obesity','Obesity (BMI ≥30)',1],['pad_hormone','Ongoing hormonal therapy',1]
];
const paduaScore=paduaItems.reduce((s,[k,,pts])=>s+(G.calcVals[k]?pts:0),0);
h+=`<div class="card" style="padding:14px"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px">PADUA VTE Risk Score</h3>`;
paduaItems.forEach(([k,l,pts])=>{
const on=G.calcVals[k]||0;
h+=`<label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc;font-size:11px;cursor:pointer">
<span>${l} (+${pts})</span>
<input type="checkbox" ${on?'checked':''} onchange="calcUp('${k}',this.checked?${pts}:0)" style="width:16px;height:16px">
</label>`;
});
h+=`<div style="margin-top:10px;padding:10px;background:#eff6ff;border-radius:10px;text-align:center" class="calc-result">
<span style="font-size:22px;font-weight:700;color:${paduaScore>=4?'#dc2626':'#059669'}">${paduaScore}</span>
<p style="font-size:10px;color:#64748b;margin-top:2px">${paduaScore>=4?'High VTE risk (≥4) — Pharmacological prophylaxis recommended':'Low VTE risk (<4) — Mechanical prophylaxis or early mobilization'}</p>
</div></div>`;





return h;
}


// ===== TRACKER =====
// topic index → {source:'haz'|'notes', label, action} for deep link
export const TOPIC_REF={
0:{s:'har',ch:285,l:'Harrison Ch 243-286'},
1:{s:'har',ch:316,l:'Harrison Ch 252-264'},
2:{s:'har',ch:247,l:'Harrison Ch 247-251'},
3:{s:'har',ch:133,l:'Harrison Ch 265-277'},
4:{s:'har',ch:56,l:'Harrison Ch 278-281'},
5:{s:'har',ch:295,l:'Harrison Ch 282-305'},
6:{s:'har',ch:332,l:'Harrison Ch 306-370'},
7:{s:'har',ch:321,l:'Harrison Ch 319-322'},
8:{s:'har',ch:56,l:'Harrison Ch 55-58'},
9:{s:'har',ch:388,l:'Harrison Ch 371-407'},
10:{s:'har',ch:120,l:'Harrison Ch 66-121'},
11:{s:'har',ch:80,l:'Harrison Ch 73-80'},
12:{s:'har',ch:315,l:'Harrison Ch 127-192'},
13:{s:'har',ch:375,l:'Harrison Ch 375-387'},
14:{s:'har',ch:437,l:'Harrison Ch 433-459'},
15:{s:'har',ch:314,l:'Harrison Ch 311-317'},
16:{s:'har',ch:56,l:'Harrison Ch 54-72'},
17:{s:'har',ch:56,l:'Harrison Ch 342-345'},
18:{s:'har',ch:56,l:'Harrison Ch 55-58'},
19:{s:'har',ch:14,l:'Harrison Ch 14-18'},
20:{s:'har',ch:56,l:'Harrison Ch 311-317'},
21:{s:'har',ch:56,l:'Harrison Ch 455-460'},
22:{s:'har',ch:56,l:'Harrison Ch 13-72'},
23:{s:'har',ch:56,l:'Harrison Ch 278-281'},
};

export function renderExamTrendCard(){
  const OLD_EX=new Set(['2020','Jun21','Jun22']);
  const NEW_EX=new Set(['May24','Oct24','Jun25']);
  const TOPICS_L=TOPICS;
  const oldTot=G.QZ.filter(q=>OLD_EX.has(q.t)).length||1;
  const newTot=G.QZ.filter(q=>NEW_EX.has(q.t)).length||1;
  const trends=TOPICS_L.map((name,ti)=>{
    const oldN=G.QZ.filter(q=>OLD_EX.has(q.t)&&q.ti===ti).length;
    const newN=G.QZ.filter(q=>NEW_EX.has(q.t)&&q.ti===ti).length;
    const delta=(newN/newTot - oldN/oldTot)*100;
    return{ti,name,oldN,newN,oldPct:oldN/oldTot*100,newPct:newN/newTot*100,delta};
  }).filter(r=>r.oldN+r.newN>0);

  const growing=trends.filter(r=>r.delta>0.5).sort((a,b)=>b.delta-a.delta).slice(0,6);
  const shrinking=trends.filter(r=>r.delta<-0.5).sort((a,b)=>a.delta-b.delta).slice(0,4);

  let h=`<div class="card" style="padding:14px;margin-bottom:10px;border-left:4px solid #7c3aed">
<div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#7c3aed">📈 Exam Trend — 2020-22 vs May24–Jun25</div>
<div style="font-size:9px;color:#94a3b8;margin-bottom:10px">Where the exam is heading. Study accordingly.</div>`;

  h+=`<div style="font-size:10px;font-weight:700;color:#059669;margin-bottom:5px">▲ GROWING — prioritize</div>`;
  growing.forEach(r=>{
    const barW=Math.min(100,Math.round(r.delta*15));
    h+=`<div style="margin-bottom:5px">
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px">
  <span style="font-weight:${r.delta>1.5?'700':'400'}">${r.name}</span>
  <span style="color:#059669">+${r.delta.toFixed(1)}pp · ${r.newPct.toFixed(1)}% of exam</span>
</div>
<div style="height:4px;background:#e2e8f0;border-radius:2px"><div style="width:${barW}%;height:100%;background:#10b981;border-radius:2px"></div></div>
</div>`;
  });

  h+=`<div style="font-size:10px;font-weight:700;color:#dc2626;margin-bottom:5px;margin-top:10px">▼ SHRINKING — less priority</div>`;
  shrinking.forEach(r=>{
    h+=`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">
<span style="color:#64748b">${r.name}</span>
<span style="color:#dc2626">${r.delta.toFixed(1)}pp</span>
</div>`;
  });

  h+=`<div style="font-size:9px;color:#94a3b8;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:6px">Old: 2021+2022+יוני23 (${oldTot}q) · New: ספט24+יוני25+2025-א (${newTot}q)</div>`;
  h+=`</div>`;
  return h;
}
export function saveSessionSummary(){
  try{
    const TOPICS_L=TOPICS;
    const dur=Math.floor((Date.now()-G._sessionStart)/1000);
    const best=Object.entries(G._sessionBest).sort((a,b)=>b[1]-a[1])[0];
    const worse=Object.entries(G._sessionWorse).sort((a,b)=>b[1]-a[1])[0];
    const sess={
      date:new Date().toISOString(),
      ok:G._sessionOk,no:G._sessionNo,dur,
      best:best?{ti:+best[0],name:TOPICS_L[+best[0]],n:best[1]}:null,
      worse:worse?{ti:+worse[0],name:TOPICS_L[+worse[0]],n:worse[1]}:null,
      due:getDueQuestions().length
    };
    const hist=JSON.parse(localStorage.getItem('pnimit_sessions')||'[]');
    hist.push(sess);if(hist.length>30)hist.splice(0,hist.length-30);
    localStorage.setItem('pnimit_sessions',JSON.stringify(hist));
  }catch(e){}
}
// ===== FEATURE 5: Daily Study Plan =====
export function renderDailyPlan(){
if(!G.S.examDate&&!localStorage.getItem('pnimit_exam_date'))return '';
const examDate=G.S.examDate||localStorage.getItem('pnimit_exam_date')||'';
const daysLeft=examDate?Math.max(0,Math.ceil((new Date(examDate)-Date.now())/864e5)):null;
const dueN=getDueQuestions().length;
const tSt=getTopicStats();
const weakest=TOPICS.map((t,i)=>({name:t,i,s:tSt[i]||{ok:0,no:0,tot:0}})).filter(p=>p.s.tot>=3).sort((a,b)=>{
const pa=a.s.tot?a.s.ok/a.s.tot:0,pb=b.s.tot?b.s.ok/b.s.tot:0;return pa-pb;}).slice(0,3);
const trapCount=G.QZ.filter((_,i)=>isExamTrap(i)).length;
let h=`<div class="card" style="padding:14px;margin-bottom:10px;border-left:4px solid #059669">
<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#059669">📋 Today's Study Plan</div>`;
if(daysLeft!==null)h+=`<div style="font-size:10px;color:#64748b;margin-bottom:10px">${daysLeft} days to exam · ${new Date(examDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>`;
h+=`<div style="font-size:11px;line-height:2">`;
// Step 1: Due questions
if(dueN>0)h+=`<div>1️⃣ <b>${dueN} due questions</b> (~${Math.round(dueN*1.5)} min) <button onclick="setFilt('due');G.tab='quiz';G.render()" style="font-size:9px;padding:2px 8px;background:#eff6ff;color:#3b82f6;border:none;border-radius:6px;cursor:pointer">▶ Start</button></div>`;
else h+=`<div>1️⃣ ✅ No questions due — you're caught up!</div>`;
// Step 2: Weakest topic
if(weakest.length){
const w=weakest[0];
const wPct=w.s.tot?Math.round(w.s.ok/w.s.tot*100):0;
const ref=TOPIC_REF[w.i];
h+=`<div>2️⃣ Read: <b>${w.name}</b> (${wPct}% accuracy, ${G.QZ.filter(q=>q.ti===w.i).length} questions) ${ref?`<button onclick="G.tab='lib';G.libSec='harrison';G.render()" style="font-size:9px;padding:2px 8px;background:#ede9fe;color:#7c3aed;border:none;border-radius:6px;cursor:pointer">📖 Open</button>`:''}</div>`;
h+=`<div>3️⃣ Drill: <b>20q mini-exam on ${w.name}</b> <button onclick="startTopicMiniExam(${w.i})" style="font-size:9px;padding:2px 8px;background:#dcfce7;color:#166534;border:none;border-radius:6px;cursor:pointer">🎯 Start</button></div>`;
}
// Step 3: Traps
if(trapCount>0)h+=`<div>4️⃣ Review <b>${trapCount} trap questions</b> <button onclick="setFilt('traps');G.tab='quiz';G.render()" style="font-size:9px;padding:2px 8px;background:#fffbeb;color:#92400e;border:none;border-radius:6px;cursor:pointer">🪤 Start</button></div>`;
h+=`</div></div>`;
return h;
}
export function setExamDate(){
const d=prompt('Enter exam date (YYYY-MM-DD):',G.S.examDate||'');
if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){G.S.examDate=d;localStorage.setItem('pnimit_exam_date',d);G.save();G.render();}
}
// ===== FEATURE 10: Cheat Sheet Export =====
export function exportCheatSheet(){
const tSt=getTopicStats();
const ranked=TOPICS.map((t,i)=>({name:t,i,s:tSt[i]||{ok:0,no:0,tot:0}})).filter(p=>p.s.tot>0).sort((a,b)=>{
const pa=a.s.tot?a.s.ok/a.s.tot:0,pb=b.s.tot?b.s.ok/b.s.tot:0;return pa-pb;});
const weak15=ranked.slice(0,15);
let doc='<html><head><meta charset="UTF-8"><title>Pnimit Mega — Cheat Sheet</title>';
doc+='<style>body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:0 auto;padding:16px;font-size:11px;color:#1e293b}';
doc+='h1{font-size:16px;margin-bottom:4px}h2{font-size:13px;color:#dc2626;margin:12px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px}';
doc+='.bar{height:6px;background:#e2e8f0;border-radius:3px;margin:2px 0 6px}.fill{height:100%;border-radius:3px}';
doc+='.topic{margin-bottom:10px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid}';
doc+='.stat{font-size:10px;color:#64748b}@media print{body{font-size:10px}}</style></head><body>';
doc+='<h1>🩺 Pnimit Mega — Personal Weak Topics Cheat Sheet</h1>';
doc+='<p style="color:#64748b;font-size:10px">Generated '+new Date().toLocaleDateString('en-GB')+' · '+G.QZ.length+' questions analyzed</p>';
weak15.forEach((p,idx)=>{
const pct=p.s.tot?Math.round(p.s.ok/p.s.tot*100):0;
const clr=pct>=70?'#10b981':pct>=50?'#f59e0b':'#ef4444';
const note=G.NOTES.find(n=>n.id===p.i||G.NOTES.indexOf(n)===p.i);
const keyFacts=note?note.notes.split(/\n|\. /).filter(s=>s.length>15).slice(0,5):[];
doc+='<div class="topic">';
doc+='<h2>#'+(idx+1)+' '+p.name+' — '+pct+'% ('+p.s.ok+'/'+p.s.tot+')</h2>';
doc+='<div class="bar"><div class="fill" style="width:'+pct+'%;background:'+clr+'"></div></div>';
if(keyFacts.length){doc+='<ul style="margin:4px 0;padding-left:16px">';keyFacts.forEach(f=>{doc+='<li>'+f.trim()+'</li>';});doc+='</ul>';}
doc+='</div>';
});
doc+='<p style="text-align:center;color:#94a3b8;margin-top:16px;font-size:9px">صدقة جارية الى من نحب</p>';
doc+='</body></html>';
const w=window.open('','_blank');w.document.write(doc);w.document.close();
setTimeout(()=>w.print(),500);
}
export function renderSessionCard(){
  try{
    const hist=JSON.parse(localStorage.getItem('pnimit_sessions')||'[]');
    if(!hist.length)return '';
    const last=hist[hist.length-1];
    const tot=last.ok+last.no;
    const pct=tot?Math.round(last.ok/tot*100):0;
    const mins=Math.round(last.dur/60);
    const today=new Date().toDateString();
    const sessDate=new Date(last.date).toDateString();
    if(sessDate!==today)return '';
    return `<div class="card" style="padding:14px;margin-bottom:10px;border-left:4px solid #7c3aed">
<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#7c3aed">📊 Today's Session</div>
<div style="display:flex;gap:12px;margin-bottom:8px">
  <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:${pct>=70?'#059669':pct>=50?'#d97706':'#dc2626'}">${pct}%</div><div style="font-size:9px;color:#94a3b8">${last.ok}/${tot} correct</div></div>
  <div style="text-align:center"><div style="font-size:18px;font-weight:700">${mins}m</div><div style="font-size:9px;color:#94a3b8">duration</div></div>
  <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:#f59e0b">${last.due}</div><div style="font-size:9px;color:#94a3b8">due tomorrow</div></div>
</div>
${last.best?`<div style="font-size:10px;margin-bottom:2px">✅ Best: <b>${last.best.name}</b> (${last.best.n} correct)</div>`:''}
${last.worse?`<div style="font-size:10px">🔴 Worst: <b>${last.worse.name}</b> (${last.worse.n} wrong)</div>`:''}
<button onclick="this.parentElement.style.display='none'" style="margin-top:8px;font-size:9px;color:#94a3b8;background:none;border:none;cursor:pointer" aria-label="Dismiss notification">dismiss</button>
</div>`;
  }catch(e){return '';}
}
export function calcEstScore(){
  // FSRS-aware estimated score: weight by retrievability for seen questions
  const now2=Date.now();
  // Frequency weights from historical exam distribution
  const totalFreq=EXAM_FREQ.reduce((a,b)=>a+b,0);
  const tSt=G.S.ts||{};
  const due=new Set(getDueQuestions());

  let weightedScore=0,totalWeight=0;
  EXAM_FREQ.forEach((freq,ti)=>{
    if(!freq)return;
    const s=tSt[ti]||{ok:0,no:0,tot:0};
    const weight=freq/totalFreq;
    let acc;
    if(s.tot<3){
      // Not enough data — assume 60% (neutral)
      acc=0.60;
    } else {
      acc=s.ok/s.tot;
      // Penalize if due questions exist in this topic
      const duePenalty=G.QZ.filter((_,i)=>G.QZ[i]?.ti===ti&&due.has(i)).length;
      if(duePenalty>0)acc=Math.max(0,acc-duePenalty*0.02);
    }
    weightedScore+=acc*weight;
    totalWeight+=weight;
  });
  return totalWeight>0?Math.round(weightedScore/totalWeight*100):null;
}

// ===== HARRISON'G.S 22e CHAPTER MAPPING =====
// Maps topic names to {ch: 'Chapter(s)', p: PDF page number}
// PDF: https://drive.google.com/file/d/1sW0asEfszQJvbeAqd8Lzcf6Q20JPq77r/view
const HAR_CHAPTERS = {
  'ACS (STEMI/NSTEMI)': {ch:'285–286'},
  'Heart Failure': {ch:'252'},
  'Arrhythmias & ECG': {ch:'247'},
  'Hypertension': {ch:'261'},
  'Valvular Disease': {ch:'256'},
  'Sepsis & Septic Shock': {ch:'315'},
  'Pneumonia & CAP/HAP': {ch:'127'},
  'Endocarditis': {ch:'133'},
  'Meningitis & Encephalitis': {ch:'142–143'},
  'Shock (All Types)': {ch:'314–316'},
  'Cardiac Arrest & ACLS': {ch:'317'},
  'Mechanical Ventilation': {ch:'311'},
  'AKI & CKD': {ch:'321–322'},
  'Electrolyte Disorders': {ch:'56'},
  'Acid-Base Disorders': {ch:'58'},
  'Cirrhosis & Complications': {ch:'355'},
  'GI Bleeding': {ch:'51'},
  'Jaundice & Liver Disease': {ch:'52, 347'},
  'Diarrhea & Constipation': {ch:'49'},
  'Pulmonary Embolism & VTE': {ch:'295'},
  'COPD & Asthma': {ch:'295'},
  'Dyspnea & Hypoxia': {ch:'39, 42'},
  'Pleural Disease': {ch:'305'},
  'Anemia (Iron, B12, Chronic)': {ch:'66, 102'},
  'Bleeding & Coagulation': {ch:'69, 121'},
  'Thrombocytopenia & Platelet Disorders': {ch:'120'},
  'Anticoagulation': {ch:'121'},
  'Ischemic Stroke & ICH': {ch:'438–439'},
  'Seizures & Epilepsy': {ch:'436'},
  'Coma & AMS': {ch:'30'},
  'GBS & Myasthenia Gravis': {ch:'458–459'},
  'Diabetes & DKA/HHS': {ch:'388'},
  'Thyroid Disease': {ch:'388'},
  'Adrenal Disorders': {ch:'388'},
  'Vasculitis Syndromes': {ch:'375'},
  'Sarcoidosis': {ch:'379'},
  'Gout & Crystal Arthropathies': {ch:'384'},
  'Rheumatoid & MSK': {ch:'382, 387'},
  'Oncologic Emergencies': {ch:'80'},
  'Cancer Screening': {ch:'79'},
  'Infections in Cancer': {ch:'79'},
  'DIGIT-HF / ECLIPSE / BALANCE': {ch:'Articles 1–3'},
  'SELECT-GCA / STELLAR / ECST-2': {ch:'Articles 7, 9, 10'},
  'Baxdrostat / Apixaban VTE / FIRE': {ch:'Articles 4–6, 8'},
  'Fluids & Volume Management': {ch:'56'},
  'Pain & Palliative': {ch:'14'},
  'Perioperative Medicine': {ch:'—'},
  'Toxicology & Overdose': {ch:'—'},
  'Dermatology': {ch:'—'},
  'Allergy & Anaphylaxis': {ch:'—'},
  'Clinical Approach & DDx': {ch:'15–22'},
  'Vascular Disease': {ch:'—'},
};

// ===== STUDY PLAN DATA =====
const STUDY_PLAN = [
  { tier: 1, label: 'Tier 1 — Know Cold', color: '#dc3545', desc: '~40% of exam', domains: [
    { name: 'Cardiology', topics: [
      { n: 'ACS (STEMI/NSTEMI)', ti: 0, hrs: '5-6h' },
      { n: 'Heart Failure', ti: 1, hrs: '4-5h' },
      { n: 'Arrhythmias & ECG', ti: 2, hrs: '4-5h' },
      { n: 'Hypertension', ti: 4, hrs: '3-4h' },
      { n: 'Valvular Disease', ti: 3, hrs: '3h' },
    ]},
    { name: 'Infectious Disease', topics: [
      { n: 'Sepsis & Septic Shock', ti: 12, hrs: '4-5h' },
      { n: 'Pneumonia & CAP/HAP', ti: 12, hrs: '3-4h' },
      { n: 'Endocarditis', ti: 12, hrs: '3h' },
      { n: 'Meningitis & Encephalitis', ti: 12, hrs: '3h' },
    ]},
    { name: 'Critical Care', topics: [
      { n: 'Shock (All Types)', ti: 15, hrs: '4-5h' },
      { n: 'Cardiac Arrest & ACLS', ti: 15, hrs: '3h' },
      { n: 'Mechanical Ventilation', ti: 15, hrs: '2-3h' },
    ]},
    { name: 'Nephrology', topics: [
      { n: 'AKI & CKD', ti: 7, hrs: '4-5h' },
      { n: 'Electrolyte Disorders', ti: 8, hrs: '4-5h' },
      { n: 'Acid-Base Disorders', ti: 8, hrs: '3-4h' },
    ]},
  ]},
  { tier: 2, label: 'Tier 2 — High Yield', color: '#fd7e14', desc: '~30% of exam', domains: [
    { name: 'GI & Hepatology', topics: [
      { n: 'Cirrhosis & Complications', ti: 6, hrs: '4h' },
      { n: 'GI Bleeding', ti: 6, hrs: '3h' },
      { n: 'Jaundice & Liver Disease', ti: 6, hrs: '2-3h' },
      { n: 'Diarrhea & Constipation', ti: 6, hrs: '2h' },
    ]},
    { name: 'Pulmonology', topics: [
      { n: 'Pulmonary Embolism & VTE', ti: 5, hrs: '3-4h' },
      { n: 'COPD & Asthma', ti: 5, hrs: '3h' },
      { n: 'Dyspnea & Hypoxia', ti: 5, hrs: '2-3h' },
      { n: 'Pleural Disease', ti: 5, hrs: '2h' },
    ]},
    { name: 'Hematology', topics: [
      { n: 'Anemia (Iron, B12, Chronic)', ti: 10, hrs: '3-4h' },
      { n: 'Bleeding & Coagulation', ti: 10, hrs: '3-4h' },
      { n: 'Thrombocytopenia & Platelet Disorders', ti: 10, hrs: '2-3h' },
      { n: 'Anticoagulation', ti: 10, hrs: '2-3h' },
    ]},
    { name: 'Neurology', topics: [
      { n: 'Ischemic Stroke & ICH', ti: 14, hrs: '4h' },
      { n: 'Seizures & Epilepsy', ti: 14, hrs: '2-3h' },
      { n: 'Coma & AMS', ti: 14, hrs: '2-3h' },
      { n: 'GBS & Myasthenia Gravis', ti: 14, hrs: '2h' },
    ]},
  ]},
  { tier: 3, label: 'Tier 3 — Important', color: '#0D7377', desc: '~20% of exam', domains: [
    { name: 'Endocrinology', topics: [
      { n: 'Diabetes & DKA/HHS', ti: 9, hrs: '4h' },
      { n: 'Thyroid Disease', ti: 9, hrs: '2-3h' },
      { n: 'Adrenal Disorders', ti: 9, hrs: '2h' },
    ]},
    { name: 'Rheumatology', topics: [
      { n: 'Vasculitis Syndromes', ti: 13, hrs: '3h' },
      { n: 'Sarcoidosis', ti: 13, hrs: '2-3h' },
      { n: 'Gout & Crystal Arthropathies', ti: 13, hrs: '2h' },
      { n: 'Rheumatoid & MSK', ti: 13, hrs: '2h' },
    ]},
    { name: 'Oncology', topics: [
      { n: 'Oncologic Emergencies', ti: 11, hrs: '2-3h' },
      { n: 'Cancer Screening', ti: 11, hrs: '2h' },
      { n: 'Infections in Cancer', ti: 11, hrs: '2h' },
    ]},
    { name: 'Landmark Trials', topics: [
      { n: 'DIGIT-HF / ECLIPSE / BALANCE', ti: 22, hrs: '3h' },
      { n: 'SELECT-GCA / STELLAR / ECST-2', ti: 22, hrs: '3h' },
      { n: 'Baxdrostat / Apixaban VTE / FIRE', ti: 22, hrs: '2h' },
    ]},
  ]},
  { tier: 4, label: 'Tier 4 — Lower Yield', color: '#6c757d', desc: '~10% of exam', domains: [
    { name: 'Special Topics', topics: [
      { n: 'Fluids & Volume Management', ti: 18, hrs: '2h' },
      { n: 'Pain & Palliative', ti: 19, hrs: '2h' },
      { n: 'Perioperative Medicine', ti: 20, hrs: '2h' },
      { n: 'Toxicology & Overdose', ti: 21, hrs: '2h' },
      { n: 'Dermatology', ti: 16, hrs: '1-2h' },
      { n: 'Allergy & Anaphylaxis', ti: 17, hrs: '1-2h' },
      { n: 'Clinical Approach & DDx', ti: 22, hrs: '2h' },
      { n: 'Vascular Disease', ti: 23, hrs: '1-2h' },
    ]},
  ]},
];

export function renderStudyPlan(){
  const spOpen = G.S.spOpen !== undefined ? G.S.spOpen : true;
  if (spOpen !== G.S.spOpen) G.S.spOpen = spOpen;

  // Count total topics and checked topics
  let totalTopics = 0, checkedTopics = 0;
  STUDY_PLAN.forEach(tier => {
    tier.domains.forEach(domain => {
      domain.topics.forEach(topic => {
        totalTopics++;
        if(G.S.sp && G.S.sp[topic.n]) checkedTopics++;
      });
    });
  });

  const spPct = totalTopics > 0 ? Math.round(checkedTopics / totalTopics * 100) : 0;

  let h = `<div class="card" style="margin-bottom:12px">
  <div style="padding:14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="G.S.spOpen=!G.S.spOpen;G.save();G.render()" role="button" tabindex="0" aria-expanded="${spOpen?'true':'false'}" aria-label="Study Plan">
    <div style="display:flex;align-items:center;gap:8px;flex:1">
      <div style="font-size:16px">📅</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;margin-bottom:2px">Study Plan — Internal Medicine</div>
        <div style="font-size:9px;color:#64748b">${checkedTopics}/${totalTopics} topics (${spPct}%)</div>
      </div>
    </div>
    <div style="font-size:12px;color:#94a3b8;transition:transform .2s" class="${spOpen?'':''}">▼</div>
  </div>`;

  if(spOpen){
    // Progress bar
    h += `<div style="padding:0 14px;margin-bottom:10px">
    <div style="width:100%;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
      <div style="width:${spPct}%;height:100%;background:rgb(var(--em));border-radius:3px;transition:width .3s ease"></div>
    </div>
    </div>`;

    // Tiers
    STUDY_PLAN.forEach(tier => {
      const tierOpen = G.S['sp_t' + tier.tier] !== undefined ? G.S['sp_t' + tier.tier] : true;

      // Count topics for this tier
      let tierTopics = 0, tierChecked = 0;
      tier.domains.forEach(domain => {
        domain.topics.forEach(topic => {
          tierTopics++;
          if(G.S.sp && G.S.sp[topic.n]) tierChecked++;
        });
      });

      h += `<div style="border-top:1px solid #f1f5f9;padding:0">
      <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;background:#f8fafc" onclick="G.S['sp_t${tier.tier}']=!G.S['sp_t${tier.tier}'];G.save();G.render()" role="button" tabindex="0" aria-expanded="${tierOpen?'true':'false'}">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <div style="width:20px;height:20px;border-radius:8px;background:${tier.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">${tier.tier}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:11px">${tier.label}</div>
            <div style="font-size:8px;color:#94a3b8;margin-top:1px">${tierChecked}/${tierTopics} · ${tier.desc}</div>
          </div>
        </div>
        <div style="font-size:10px;color:#94a3b8;transition:transform .2s;transform:${tierOpen?'':'rotate(-90deg)'}">${tierOpen?'▼':'▶'}</div>
      </div>`;

      if(tierOpen){
        tier.domains.forEach(domain => {
          h += `<div style="padding:8px 14px;border-top:1px solid #f1f5f9">
          <div style="font-size:10px;font-weight:600;color:#475569;margin-bottom:6px">${domain.name}</div>`;

          domain.topics.forEach(topic => {
            const isChecked = G.S.sp && G.S.sp[topic.n];
            const tSt = getTopicStats();
            const topicStat = tSt[topic.ti];
            let accBadge = '';
            if(topicStat && topicStat.tot > 0){
              const acc = Math.round(topicStat.ok / topicStat.tot * 100);
              let badgeColor = '#94a3b8';
              if(acc >= 70) badgeColor = '#059669';
              else if(acc >= 50) badgeColor = '#d97706';
              else badgeColor = '#dc2626';
              accBadge = `<span style="background:${badgeColor}20;color:${badgeColor};padding:2px 6px;border-radius:4px;font-size:8px;font-weight:600">${acc}%</span>`;
            }

            h += `<div style="border-radius:8px;margin-bottom:4px;background:${isChecked?'#f8fafc':'transparent'}">
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;font-size:10px;cursor:pointer" onclick="event.stopPropagation();G.S.sp=G.S.sp||{};G.S.sp['${topic.n.replace(/'/g,"\\'")}']=!G.S.sp['${topic.n.replace(/'/g,"\\'")}']; G.save();G.render()" role="checkbox" aria-checked="${isChecked?'true':'false'}" tabindex="0">
            <input type="checkbox" ${isChecked?'checked':''} readonly style="width:14px;height:14px;flex-shrink:0;cursor:pointer" tabindex="-1">
            <span style="flex:1;${isChecked?'color:#94a3b8;text-decoration:line-through':'color:#1e293b'}">${topic.n}</span>
            ${accBadge}
            <span style="color:#94a3b8;font-size:9px;white-space:nowrap">${topic.hrs}</span>
            </div>
            <div style="display:flex;gap:4px;padding:0 8px 6px 36px;flex-wrap:wrap">
            ${HAR_CHAPTERS[topic.n]?`<button onclick="event.stopPropagation();G.libSec=\"harrison\";G.tab=\"lib\";G.render()" style="font-size:9px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#b45309;cursor:pointer;white-space:nowrap">📕 Ch ${HAR_CHAPTERS[topic.n].ch}</button>`:""}
            <button onclick="event.stopPropagation();G.openNote=${topic.ti};go('study')" style="font-size:9px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#0D7377;cursor:pointer;white-space:nowrap" aria-label="Open notes for ${topic.n.replace(/'/g,'')}">📖 Notes</button>
            <button onclick="event.stopPropagation();setTopicFilt(${topic.ti});go('quiz')" style="font-size:9px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#3b82f6;cursor:pointer;white-space:nowrap" aria-label="Quiz ${topic.n.replace(/'/g,'')}">📝 Quiz</button>
            <button onclick="event.stopPropagation();G.S.chat=[];go('chat');setTimeout(function(){sendChatStarter('Give me a concise board-review summary of ${topic.n.replace(/'/g,"\\'")} in internal medicine. Cover: key definitions, diagnostic criteria, management pearls, exam traps, and must-know numbers. Format with bold headings.')},100)" style="font-size:9px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#7c3aed;cursor:pointer;white-space:nowrap" aria-label="AI summary of ${topic.n.replace(/'/g,'')}">🤖 Summarize</button>
            </div>
            </div>`;
          });

          h += `</div>`;
        });
      }

      h += `</div>`;
    });
  }

  h += `</div>`;
  return h;
}

export function renderTrack(){
const done=Object.values(G.S.ck).filter(Boolean).length;
const tot=G.S.qOk+G.S.qNo;const pctN=tot?Math.round(G.S.qOk/tot*100):0;const pct=tot?pctN+'%':'—';
const bkCount=Object.values(G.S.bk).filter(Boolean).length;
const dueN=getDueQuestions().length;
const readiness=calcEstScore();
const streak=getStudyStreak();
// Key metrics row
let h=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
<div class="card" style="padding:10px;text-align:center">
<div style="font-size:22px;font-weight:800;color:${readiness===null?'#94a3b8':readiness>=70?'#059669':readiness>=50?'#d97706':'#dc2626'}">${readiness!==null?readiness+'%':'—'}</div>
<div style="font-size:9px;color:#64748b">Est. Score</div>
</div>
<div class="card" style="padding:10px;text-align:center">
<div style="font-size:22px;font-weight:800;color:#7c3aed">${streak}</div>
<div style="font-size:9px;color:#64748b">Day Streak</div>
</div>
<div class="card" style="padding:10px;text-align:center">
<div style="font-size:22px;font-weight:800;color:#0ea5e9">${tot}</div>
<div style="font-size:9px;color:#64748b">Answered</div>
</div>
<div class="card" style="padding:10px;text-align:center">
<div style="font-size:22px;font-weight:800;color:${pctN>=70?'#059669':'#d97706'}">${pct}</div>
<div style="font-size:9px;color:#64748b">Accuracy</div>
</div>
</div>`;
// SRS due alert
if(dueN>0){
h+=`<div class="card" style="padding:12px;margin-bottom:8px;background:#fef2f2;border:1px solid #fecaca">
<div style="display:flex;align-items:center;gap:8px">
<span style="font-size:18px">🔔</span>
<div style="flex:1"><div style="font-size:12px;font-weight:700;color:#dc2626">${dueN} questions due for review</div>
<div style="font-size:10px;color:#64748b">Spaced repetition items ready now</div></div>
<button onclick="G.filt='due';buildPool();G.tab='quiz';G.render()" class="btn" style="font-size:10px;padding:6px 12px;background:#dc2626;color:#fff;border:none;border-radius:8px">▶ Review</button>
</div></div>`;
}
// Topic mastery heatmap
const _tStats=getTopicStats();
h+=`<div class="card" style="padding:14px;margin-bottom:8px">
<div style="font-size:12px;font-weight:700;margin-bottom:8px">🗺️ Topic Mastery Map</div>
<div style="display:flex;flex-wrap:wrap;gap:3px">`;
Object.entries(_tStats).forEach(([ti,s])=>{
ti=Number(ti);if(!TOPICS[ti])return;
const _p=s.tot>=2?Math.round(s.ok/s.tot*100):null;
const color=_p===null?'#e2e8f0':_p>=80?'#059669':_p>=60?'#84cc16':_p>=40?'#f59e0b':'#ef4444';
const bg=_p===null?'#f8fafc':_p>=80?'#ecfdf5':_p>=60?'#f7fee7':_p>=40?'#fffbeb':'#fef2f2';
h+=`<div onclick="G.tab='quiz';G.filt='topic';G.topicFilt=${ti};buildPool();G.render()" style="padding:4px 6px;border-radius:6px;font-size:8px;background:${bg};color:${color};font-weight:700;cursor:pointer;border:1px solid ${color}30;min-width:28px;text-align:center" title="${TOPICS[ti]}: ${_p!==null?_p+'%':'no data'} (${s.tot} Qs)">${_p!==null?_p+'%':'·'}</div>`;
});
h+=`</div></div>`;
h+=renderStudyPlan();
// Feature 5: Exam date + daily plan
if(!G.S.examDate&&!localStorage.getItem('pnimit_exam_date')){
h+=`<div class="card" style="padding:14px;margin-bottom:10px;text-align:center">
<div style="font-size:12px;font-weight:700;margin-bottom:6px">📅 When is your exam?</div>
<button class="btn btn-p" onclick="setExamDate()" style="font-size:11px">Set Exam Date</button>
</div>`;
}else{
h+=renderDailyPlan();
}
h+=renderSessionCard();
// Feature 9: Confidence accuracy matrix
const _confStats={sure_ok:0,sure_no:0,unsure_ok:0,unsure_no:0};
Object.values(G.S.sr||{}).forEach(s=>{if(s.conf){Object.entries(s.conf).forEach(([k,v])=>{if(_confStats[k]!==undefined)_confStats[k]+=v;});}});
const _confTotal=Object.values(_confStats).reduce((a,b)=>a+b,0);
if(_confTotal>=10){
const _blindSpots=_confStats.sure_no;
const _lucky=_confStats.unsure_ok;
h+=`<div class="card" style="padding:14px;margin-bottom:10px">
<div style="font-weight:700;font-size:12px;margin-bottom:8px">🎯 Confidence Matrix (${_confTotal} rated)</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;text-align:center">
<div style="padding:8px;background:#dcfce7;border-radius:8px"><div style="font-size:16px;font-weight:700">${_confStats.sure_ok}</div>😎✅ Confident + Right</div>
<div style="padding:8px;background:#fecaca;border-radius:8px"><div style="font-size:16px;font-weight:700;color:#dc2626">${_confStats.sure_no}</div>😎❌ BLIND SPOTS</div>
<div style="padding:8px;background:#fef9c3;border-radius:8px"><div style="font-size:16px;font-weight:700">${_confStats.unsure_ok}</div>😬✅ Lucky</div>
<div style="padding:8px;background:#f1f5f9;border-radius:8px"><div style="font-size:16px;font-weight:700">${_confStats.unsure_no}</div>😬❌ Expected miss</div>
</div>
${_blindSpots>0?`<div style="margin-top:8px;font-size:10px;color:#dc2626;font-weight:600">⚠️ ${_blindSpots} blind spots — you were confident but wrong. These are your most dangerous gaps.</div>`:''}
</div>`;
}
// Feature 10: Cheat sheet export button
h+=`<div class="card" style="padding:14px;margin-bottom:10px;text-align:center">
<button class="btn btn-d" onclick="exportCheatSheet()" style="font-size:11px" aria-label="Export cheat sheet">📄 Export Weak Topics Cheat Sheet</button>
<div style="font-size:9px;color:#94a3b8;margin-top:4px">Print-ready 2-page summary of your 15 weakest topics</div>
</div>`;
// Feature 5: Change exam date
if(G.S.examDate||localStorage.getItem('pnimit_exam_date')){
h+=`<div style="text-align:center;margin-bottom:10px"><button onclick="setExamDate()" style="font-size:9px;color:#94a3b8;background:none;border:none;cursor:pointer;text-decoration:underline">📅 Change exam date</button></div>`;
}
h+=renderExamTrendCard();
// Rescue Drill CTA
const _weakTopics=getWeakTopics(3);
if(_weakTopics.length&&_weakTopics[0].pct!==null&&_weakTopics[0].pct<65){
h+=`<div class="card" style="padding:14px;margin-bottom:10px;background:linear-gradient(135deg,#fef2f2,#fffbeb);border:1px solid #fecaca">
<div style="display:flex;align-items:center;gap:10px">
<span style="font-size:24px">🚨</span>
<div style="flex:1">
<div style="font-weight:700;font-size:12px;color:#dc2626">Rescue Drill</div>
<div style="font-size:10px;color:#64748b">${_weakTopics.map(w=>TOPICS[w.ti]+' ('+w.pct+'%)').join(' \u00b7 ')}</div>
</div>
<button onclick="buildRescuePool();G.tab='quiz';G.render()" class="btn" style="font-size:11px;padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-weight:700">GO</button>
</div></div>`;
}
// Activity Calendar (30 days)
h+=`<div class="card" style="padding:14px;margin-bottom:10px">
<div style="font-size:12px;font-weight:700;margin-bottom:8px">📅 Activity (last 30 days)</div>
<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px">`;
for(let _i=29;_i>=0;_i--){
const _d=new Date();_d.setDate(_d.getDate()-_i);
const _dk=_d.toISOString().slice(0,10);
const _act=G.S.dailyAct&&G.S.dailyAct[_dk];
const _qc=_act?_act.q:0;
const _int=_qc===0?0:_qc<5?1:_qc<15?2:_qc<30?3:4;
const _cols=['#f1f5f9','#dcfce7','#86efac','#22c55e','#15803d'];
h+=`<div style="aspect-ratio:1;border-radius:3px;background:${_cols[_int]}" title="${_dk}: ${_qc} Qs"></div>`;
}
h+=`</div></div>`;
// Spaced Reading Due
const _harDue=getChaptersDueForReading('har',30);
if(_harDue.length){
h+=`<div class="card" style="padding:14px;margin-bottom:10px">
<div style="font-size:12px;font-weight:700;margin-bottom:8px">📖 Chapters Due for Re-Reading</div>`;
_harDue.slice(0,5).forEach(c=>{
  const _chData=G._harData&&G._harData[c.ch];
  const _title=_chData?_chData.title:'Ch '+c.ch;
  h+=`<div onclick="G.tab='lib';G.libSec='harrison';openHarrisonChapter(${c.ch})" style="font-size:10px;padding:4px 0;cursor:pointer;color:#64748b;border-bottom:1px solid #f8fafc">📗 Ch ${c.ch}: ${_title} <span style="color:#7c3aed;font-weight:700">(${c.daysSince}d ago)</span></div>`;
});
h+=`</div>`;
}
// Leaderboard
h+=`<div class="card" style="padding:14px;margin-bottom:10px">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
<span style="font-size:14px">🏆</span>
<div style="font-size:12px;font-weight:700;flex:1">Leaderboard</div>
<button onclick="showLeaderboard()" style="font-size:9px;padding:4px 10px;background:#f59e0b;color:#fff;border:none;border-radius:6px;cursor:pointer">Refresh</button>
</div>
<div id="leaderboard-box" style="font-size:10px;color:#94a3b8;text-align:center">Tap refresh to load</div>
</div>`;
h+=`<div class="sec-t">Progress</div><div class="sec-s">Syllabus · Bookmarks · Spaced Repetition</div>`;
if(G.S.streak>0)h+=`<div style="text-align:center;margin-bottom:12px"><span class="streak-badge">🔥 ${G.S.streak} day${G.S.streak>1?'s':''} streak</span></div>`;
const estScore=calcEstScore();
h+=`<div class="stats">
<div class="stat"><div class="n" style="color:rgb(var(--em))">${done}/${TOPICS.length}</div><div class="l">Topics</div></div>
<div class="stat"><div class="n" style="color:rgb(var(--sky))">${pct}</div><div class="l">Quiz</div></div>
<div class="stat"><span class="tt-wrap"><div class="n" style="color:${estScore===null?'#94a3b8':estScore>=70?'#059669':estScore>=60?'#d97706':'#dc2626'}">${estScore!==null?estScore+'%':'—'}</div><div class="l">Est. Score <button class="tt-icon" tabindex="0">ⓘ</button></div><div class="tt-box" style="left:0;transform:none">Rolling exam score estimate: topic accuracy × exam frequency weight. Penalizes overdue SR cards. Needs 3+ answers per topic for accuracy. Pass = 60%.</div></span></div>
<div class="stat"><span class="tt-wrap"><div class="n" style="color:rgb(var(--amb))">${dueN}</div><div class="l">Due (SR) <button class="tt-icon" tabindex="0">ⓘ</button></div><div class="tt-box" style="left:0;transform:none">Spaced repetition cards due for review. Based on your past performance.</div></span></div>
</div>`;
// Bookmarked questions with folder grouping
if(bkCount>0){
const _byTopic={};
Object.entries(G.S.bk).filter(([,v])=>v).forEach(([k])=>{
const q=G.QZ[k];if(!q)return;
const tp=TOPICS[q.ti]||'Other';
if(!_byTopic[tp])_byTopic[tp]=[];
_byTopic[tp].push({k:k,q:q});
});
const _topicKeys=Object.keys(_byTopic);
if(_topicKeys.length>1){
h+='<div class="card" style="padding:14px"><div style="font-weight:700;font-size:12px;margin-bottom:8px">📁 Bookmark Folders</div>';
_topicKeys.forEach(function(topic){
var fk='bkf_'+topic.replace(/[^a-z0-9]/gi,'_');
var open=G.S[fk];
var qs=_byTopic[topic];
h+='<div style="margin-bottom:6px">';
h+='<div onclick="G.S[\''+fk+'\']=' + '!G.S[\''+fk+'\'];G.save();G.render()" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#f8fafc;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600" role="button" tabindex="0" aria-expanded="'+(open?'true':'false')+'" aria-label="'+topic+'">';
h+='<span>📁 '+topic+' ('+qs.length+')</span><span>'+(open?'▼':'▶')+'</span></div>';
if(open){qs.forEach(function(e){h+='<div style="padding:6px 12px;font-size:10px;border-bottom:1px solid #f1f5f9" class="heb" dir="rtl">'+e.q.q.substring(0,90)+'...</div>';});}
h+='</div>';
});
h+='</div>';
}else{
h+=`<div class="card" style="padding:14px"><div style="font-weight:700;font-size:12px;margin-bottom:8px">🔖 Bookmarked (${bkCount})</div>`;
Object.entries(G.S.bk).filter(([,v])=>v).slice(0,10).forEach(([k])=>{
const q=G.QZ[k];if(q)h+=`<div style="font-size:10px;padding:6px 0;border-bottom:1px solid #f8fafc" class="heb" dir="rtl">${q.q.substring(0,80)}...</div>`;
});
h+=`</div>`;
}
}
// Syllabus
h+=`<div class="card" style="padding:14px"><div style="font-weight:700;font-size:12px;margin-bottom:10px">📋 Syllabus (${done}/${TOPICS.length})</div>`;
// Per-topic accuracy bars
const tSt=getTopicStats();
const ranked=TOPICS.map((t,i)=>({name:t,i,s:tSt[i]||{ok:0,no:0,tot:0}})).filter(p=>p.s.tot>0);
if(ranked.length>0){
h+=`<div class="card" style="padding:14px;margin-bottom:10px"><div style="font-weight:700;font-size:12px;margin-bottom:10px">📊 Accuracy by Topic <span class="tt-wrap"><button class="tt-icon" tabindex="0">ⓘ</button><div class="tt-box">Shows your accuracy (% correct) for each topic you've attempted. Green ≥70%, amber ≥50%, red <50%.</div></span></div>`;
ranked.sort((a,b)=>{const pa=a.s.tot?a.s.ok/a.s.tot:0,pb=b.s.tot?b.s.ok/b.s.tot:0;return pa-pb;}).forEach(p=>{
const pct=p.s.tot?Math.round(p.s.ok/p.s.tot*100):0;
const clr=pct>=70?'rgb(var(--em))':pct>=50?'rgb(var(--amb))':'rgb(var(--red))';
h+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f8fafc;font-size:10px">
<span style="flex:1">${p.name}</span>
<div style="display:flex;align-items:center;gap:6px">
<div style="width:50px;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${clr};border-radius:3px"></div></div>
<span style="width:28px;text-align:right;font-weight:600;color:${clr}">${pct}%</span>
<span style="color:#94a3b8;font-size:8px">${p.s.tot}</span>
</div></div>`;
});
h+=`</div>`;}
// Year × Topic heatmap
const years=[...new Set(G.QZ.map(q=>q.t))].sort();
const heatData=[];
TOPICS.forEach((topic,ti)=>{
const row={topic,cells:[]};
years.forEach(yr=>{
const qs=G.QZ.map((q,i)=>({q,i})).filter(e=>e.q.ti===ti&&e.q.t===yr);
if(!qs.length){row.cells.push({yr,pct:-1,n:0});return;}
const answered=qs.filter(e=>G.S.sr[e.i]);
const correct=qs.filter(e=>{const s=G.S.sr[e.i];return s&&s.n>0&&s.ef>=2.3;});
row.cells.push({yr,pct:answered.length?Math.round(correct.length/answered.length*100):-1,n:answered.length});
});
if(row.cells.some(c=>c.n>0))heatData.push(row);
});
if(heatData.length>0){
h+=`<div class="card" style="padding:14px;margin-bottom:10px"><div style="font-weight:700;font-size:12px;margin-bottom:8px">🗺️ Weak Spots Map</div>`;
h+=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:9px"><thead><tr><th style="text-align:right;padding:3px;font-size:8px">Topic</th>`;
years.forEach(y=>{h+=`<th style="padding:3px;text-align:center;font-size:7px;white-space:nowrap">${y.length>4?y.slice(-2):y}</th>`;});
h+=`</tr></thead><tbody>`;
heatData.sort((a,b)=>{
const avgA=a.cells.filter(c=>c.n>0).reduce((s,c)=>s+c.pct,0)/(a.cells.filter(c=>c.n>0).length||1);
const avgB=b.cells.filter(c=>c.n>0).reduce((s,c)=>s+c.pct,0)/(b.cells.filter(c=>c.n>0).length||1);
return avgA-avgB;
});
heatData.forEach(row=>{
h+=`<tr><td style="padding:3px;text-align:right;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis">${row.topic}</td>`;
row.cells.forEach(c=>{
if(c.n===0){h+=`<td style="padding:2px;text-align:center;background:#f8fafc;color:#cbd5e1">·</td>`;}
else{
const bg=c.pct>=75?'#dcfce7':c.pct>=50?'#fef9c3':'#fecaca';
h+=`<td style="padding:2px;text-align:center;background:${bg};font-weight:600;border-radius:2px">${c.pct}</td>`;}
});
h+=`</tr>`;
});
h+=`</tbody></table></div>`;
h+=`<div style="display:flex;gap:8px;margin-top:6px;font-size:8px;color:#94a3b8;justify-content:center">
<span style="display:flex;align-items:center;gap:2px"><span style="width:10px;height:10px;background:#fecaca;border-radius:2px"></span>&lt;50%</span>
<span style="display:flex;align-items:center;gap:2px"><span style="width:10px;height:10px;background:#fef9c3;border-radius:2px"></span>50-74%</span>
<span style="display:flex;align-items:center;gap:2px"><span style="width:10px;height:10px;background:#dcfce7;border-radius:2px"></span>&ge;75%</span>
</div>`;
h+=`</div>`;}
// ROI Matrix and Radar chart removed — accuracy bars above are sufficient
h+=renderPriorityMatrix();

TOPICS.forEach((t,i)=>{h+=`<div class="topic${G.S.ck[i]?' done':''}" onclick="G.S.ck[${i}]=!G.S.ck[${i}];G.save();G.render()" style="display:${G.S._sylOpen?'flex':'none'}" role="checkbox" aria-checked="${G.S.ck[i]?'true':'false'}" tabindex="0" aria-label="${t}">
<input type="checkbox" ${G.S.ck[i]?'checked':''} readonly style="width:13px;height:13px" tabindex="-1"><span>${t}</span></div>`;});
h+=`<div onclick="G.S._sylOpen=!G.S._sylOpen;G.render()" style="text-align:center;padding:8px;cursor:pointer;font-size:10px;color:rgb(var(--sky));font-weight:600" role="button" tabindex="0" aria-expanded="${G.S._sylOpen}" aria-label="Toggle syllabus topics">${G.S._sylOpen?'▲ Collapse':'▼ Show '+TOPICS.length+' topics'}</div>`;
h+=`</div>`;
// IMA Links
h+=`<div class="card" style="padding:14px"><div style="font-weight:700;font-size:12px;margin-bottom:8px">📥 IMA Exam Archive</div><div style="font-size:10px">`;
[["2022","639899_34c9618e-ff88-4811-84d5-ba1fdd9d5f1c","639902_9a12e7aa-9876-40e1-bdea-0786dc417406"],
["2023","639904_14aa53eb-d114-4ab8-8bfe-938b32d02fc0","639907_33601987-d23e-4f5f-8180-53890b2cfcb4"],
["May 24","652285_f10c088f-c183-4f9c-8324-b37bedabe522","652288_5f94445c-1fe5-4207-bd42-e223be8064a0"],
["Sep 24","652291_5946c97e-78c1-4920-81e3-1081d46fdb6e","652294_46e7d570-db16-4307-b4f1-66f002ed456e"],
["Jun 25","749665_d23a3de1-a2af-4467-b2b0-71f297f6b800","766892_d886488d-27d3-487c-8088-56f67ae43409"],
].forEach(([y,q,a])=>{h+=`<div style="display:flex;gap:8px;padding:3px 0"><b style="width:48px">${y}</b><a href="https://ima-files.s3.amazonaws.com/${q}.pdf" target="_blank" style="color:rgb(var(--sky));text-decoration:underline">שאלון</a><a href="https://ima-files.s3.amazonaws.com/${a}.pdf" target="_blank" style="color:rgb(var(--sky));text-decoration:underline">תשובות</a></div>`;});
h+=`</div></div>`;
// Reset
// Share with friends
h+=`<div class="card" style="padding:14px;text-align:center;margin-top:12px">
<div style="font-weight:700;font-size:12px;margin-bottom:8px">🔗 Share with Friends</div>
<div style="font-size:10px;color:#64748b;margin-bottom:10px">Share this app with fellow internal medicine residents</div>
<button class="btn btn-p" onclick="shareApp()" style="margin-bottom:8px" aria-label="Share app link">📤 Share App Link</button>
</div>`;
// Data management
h+=`<div class="card" style="padding:14px;margin-top:12px">
<div style="font-weight:700;font-size:12px;margin-bottom:8px">💾 Data Management</div>
<div style="font-size:10px;color:#64748b;margin-bottom:10px">Your progress is saved automatically in your browser. Export to backup or transfer between devices.</div>
<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
<button class="btn btn-p" onclick="exportProgress()" aria-label="Export progress">📥 Export Progress</button>
<button class="btn btn-g" onclick="importProgress()" aria-label="Import progress">📤 Import Progress</button>
<button class="btn btn-o" onclick="if(confirm('Reset ALL data? This cannot be undone.')){localStorage.removeItem('${LS}');location.reload()}" aria-label="Reset all data">🗑️ Reset</button>
</div>
<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:8px">
<button id="cloud-backup-btn" class="btn" style="background:#e0f2fe;color:#0284c7" onclick="cloudBackup()" aria-label="Backup to cloud">☁️ Backup to Cloud</button>
<button class="btn" style="background:#f0fdf4;color:#15803d" onclick="cloudRestore()" aria-label="Restore from cloud">☁️ Restore from Cloud</button>
</div>
<div style="font-size:9px;color:#94a3b8;text-align:center;margin-top:6px">Cloud sync · progress keyed by device ID</div>
</div></div>`;
// Study Journal — wrong answer log + personal notes
h+=`<div class="card" style="padding:14px;margin-top:12px">
<div style="font-weight:700;font-size:12px;margin-bottom:10px">📓 Study Journal</div>
${renderWrongAnswerLog()}
</div>`;
// API key settings card
var _storedKey=getApiKey();
h+='<div class="card" style="padding:14px;margin-top:10px;border:2px solid '+(_storedKey?'#bbf7d0':'#fde68a')+'">';
h+='<div class="sec-t" style="font-size:13px">🔑 Anthropic API Key</div>';
h+='<div class="sec-s" style="margin-bottom:10px">לשימוש ב-AI Explain ו-Teach-Back · מאוחסן בדפדפן בלבד</div>';
if(!_storedKey){h+='<div style="padding:8px 10px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;font-size:10px;color:#065f46;margin-bottom:10px">✅ AI פועל דרך שרת proxy — לא צריך מפתח אישי. אפשר להוסיף כגיבוי. <a href="https://console.anthropic.com/keys" target="_blank" style="color:#d97706;font-weight:700">קבל מפתח ↗</a></div>';}
if(_storedKey){
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
  h+='<div style="flex:1;font-size:11px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px;color:#065f46">✅ API key מוגדר (sk-...'+_storedKey.slice(-6)+')</div>';
  h+='<button class="btn btn-o" style="font-size:11px" onclick="setApiKey(\'\');G.render()" aria-label="Remove API key">הסר</button>';
  h+='</div>';
} else {
  h+='<div style="display:flex;gap:8px;margin-bottom:8px">';
  h+='<input id="apiKeyInput" type="password" placeholder="sk-ant-..." class="calc-in" style="flex:1;margin:0;font-size:11px" aria-label="Claude API key">';
  h+='<button class="btn btn-p" style="font-size:11px" onclick="var v=document.getElementById(\'apiKeyInput\').value.trim();if(v){setApiKey(v);G.render();}" aria-label="Save API key">שמור</button>';
  h+='</div>';
}
h+='<div style="font-size:9px;color:#94a3b8">API key נשמר ב-localStorage בלבד · לא נשלח לשרתים של האפליקציה</div></div>';
// Version footer
h+=`<div style="text-align:center;margin-top:20px;padding:12px;font-size:9px;color:#94a3b8;line-height:1.8">
<div>Pnimit Mega v${APP_VERSION} · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · build ${BUILD_HASH}</div>
<div>Harrison's 22e · ${G.QZ.length} Questions</div>
<div style="margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
<button onclick="applyUpdate()" style="font-size:10px;padding:5px 14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">🔄 Force Update</button>
<a href="https://eiasash.github.io/Geriatrics/" target="_blank" style="font-size:10px;padding:5px 14px;background:#0D7377;color:#fff;border:none;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">🩺 Geriatrics App →</a>
</div>
<div style="margin-top:6px">صدقة جارية الى من نحب</div></div>`;
return h;
}

// ===== SEARCH =====
