import G from '../core/globals.js';
import { TOPICS, HARRISON_PDF_MAP, APP_VERSION, SYLLABUS_VERSION } from '../core/constants.js';
import { sanitize, safeJSONParse, toast } from "../core/utils.js";
import { callAI } from '../ai/client.js';
import { getTopicStats, trackChapterRead, getChaptersDueForReading } from '../sr/spaced-repetition.js';
import { TOPIC_REF } from './track-view.js';
import { submitReport } from '../features/cloud.js';
import { buildPool } from '../quiz/engine.js';

let sylSec='haz';
let _pendingAiQs=null; // temp storage for add-to-bank delegation
const SYL_HAZ_EXCLUDED=new Set([2,3,4,5,6,34,62]);
const SYL_HAZ=[];
const SYL_HAR_ALL=[
{ch:26,t:'Neurologic Causes of Weakness and Paralysis'},
{ch:382,t:'Approach to Articular and Musculoskeletal Disorders'},
{ch:387,t:'Periarticular Disorders of the Extremities'},
{ch:433,t:'Approach to the Patient with Neurologic Disease'},
{ch:436,t:'Seizures and Epilepsy'},
{ch:437,t:'Introduction to Cerebrovascular Diseases'},
{ch:438,t:'Ischemic Stroke'},
{ch:439,t:'Intracerebral Hemorrhage'},
{ch:458,t:'Guillain-Barré Syndrome & Immune-Mediated Neuropathies'},
{ch:459,t:'Myasthenia Gravis & Neuromuscular Junction Diseases'},
];
const SYL_HAR_BASE=[
{ch:14,t:'Pain: Pathophysiology and Management'},
{ch:15,t:'Chest Discomfort'},{ch:16,t:'Abdominal Pain'},
{ch:17,t:'Headache'},{ch:18,t:'Low Back Pain'},
{ch:20,t:'Fever'},{ch:22,t:'Fever of Unknown Origin'},
{ch:30,t:'Coma'},{ch:39,t:'Dyspnea'},
{ch:40,t:'Cough'},{ch:41,t:'Hemoptysis'},
{ch:42,t:'Hypoxia and Cyanosis'},{ch:43,t:'Edema'},
{ch:48,t:'Nausea, Vomiting, and Indigestion'},
{ch:49,t:'Diarrhea and Constipation'},
{ch:50,t:'Unintentional Weight Loss'},
{ch:51,t:'Gastrointestinal Bleeding'},
{ch:52,t:'Jaundice'},{ch:53,t:'Abdominal Swelling and Ascites'},
{ch:55,t:'Azotemia and Urinary Abnormalities'},
{ch:56,t:'Fluid and Electrolyte Disturbances'},
{ch:57,t:'Hypercalcemia and Hypocalcemia'},
{ch:58,t:'Acidosis and Alkalosis'},
{ch:66,t:'Anemia and Polycythemia'},
{ch:67,t:'Disorders of Granulocytes and Monocytes'},
{ch:69,t:'Bleeding and Thrombosis'},
{ch:70,t:'Enlargement of Lymph Nodes and Spleen'},
{ch:79,t:'Infections in Patients with Cancer'},
{ch:80,t:'Oncologic Emergencies'},
{ch:102,t:'Iron Deficiency & Hypo-proliferative Anemias'},
{ch:120,t:'Disorders of Platelets and Vessel Wall'},
{ch:121,t:'Coagulation Disorders'},
{ch:127,t:'Approach to the Acutely Ill Infected Febrile Patient'},
{ch:133,t:'Infective Endocarditis'},
{ch:136,t:'Osteomyelitis'},
{ch:142,t:'Encephalitis'},{ch:143,t:'Meningitis'},
{ch:147,t:'Infections Acquired in Health Care Facilities'},
{ch:243,t:'Approach to Patient with Cardiovascular Disease'},
{ch:247,t:'Electrocardiography'},
{ch:285,t:'NSTEMI & Unstable Angina'},
{ch:286,t:'ST-Segment Elevation Myocardial Infarction'},
{ch:295,t:'Approach to Patient with Respiratory Disease'},
{ch:305,t:'Disorders of the Pleura'},
{ch:311,t:'Approach to the Patient with Critical Illness'},
{ch:314,t:'Approach to the Patient with Shock'},
{ch:315,t:'Sepsis and Septic Shock'},
{ch:316,t:'Cardiogenic Shock and Pulmonary Edema'},
{ch:317,t:'Cardiovascular Collapse, Cardiac Arrest, Sudden Death'},
{ch:319,t:'Approach to Patient with Renal/Urinary Tract Disease'},
{ch:321,t:'Acute Kidney Injury'},
{ch:322,t:'Chronic Kidney Disease'},
{ch:332,t:'Approach to Patient with GI Disease'},
{ch:347,t:'Evaluation of Liver Function'},
{ch:355,t:'Cirrhosis and Its Complications'},
{ch:375,t:'The Vasculitis Syndromes'},
{ch:379,t:'Sarcoidosis'},
{ch:384,t:'Gout & Crystal-Associated Arthropathies'},
{ch:388,t:'Approach to Patient with Endocrine Disorders'},
];
const SYL_LAWS=[];
const SYL_ARTICLES=[
{t:'Digitoxin in Patients with Heart Failure and Reduced Ejection Fraction',j:'N Engl J Med 2025;393:1155-65'},
{t:'A Cell-free DNA Blood-Based Test for Colorectal Cancer Screening',j:'N Engl J Med 2024;390:973-83'},
{t:'Antibiotic Treatment for 7 versus 14 Days in Patients with Bloodstream Infections',j:'NEJM 2025;392:1065-78'},
{t:'Aspirin in Patients with Chronic Coronary Syndrome Receiving Oral Anticoagulation',j:'DOI: 10.1056/NEJMoa2507532'},
{t:'Efficacy and Safety of Baxdrostat in Uncontrolled and Resistant Hypertension',j:'DOI: 10.1056/NEJMoa2507109'},
{t:'Apixaban for Extended Treatment of Provoked Venous Thromboembolism',j:'N Engl J Med 2025;393:1166-76'},
{t:'A Phase 3 Trial of Upadacitinib for Giant-Cell Arteritis',j:'N Engl J Med 2025;392:2013-24'},
{t:'First-Line Treatment of Pulmonary Sarcoidosis with Prednisone or Methotrexate',j:'N Engl J Med 2025;393:231-42'},
{t:'Sotatercept in Patients with Pulmonary Arterial Hypertension at High Risk for Death',j:'N Engl J Med 2025;392:1987-2000'},
{t:'ECST-2: Optimised Medical Therapy Alone vs Plus Revascularisation for Carotid Stenosis',j:'Lancet Neurol 2025;24:389-99'},
];
// renderSyllabus removed — dead code (89 lines)

// ===== TOPIC PRIORITY MATRIX (added to Track G.tab) =====

// Library — wrong answer log, Harrison reader, renderLibrary, laws, articles, exams

export function renderWrongAnswerLog(){
  const TOPICS_L=TOPICS;
  // Get chronically failing + recently answered wrong questions
  const chronic=[];const recentWrong=[];
  Object.entries(G.S.sr||{}).forEach(([idx,s])=>{
    const q=G.QZ[+idx];if(!q)return;
    if(s.tot>=4&&s.ok/s.tot<0.35)chronic.push({idx:+idx,q,s});
    else if(s.n===0&&s.tot>=1)recentWrong.push({idx:+idx,q,s});
  });
  chronic.sort((a,b)=>a.s.ok/a.s.tot-b.s.ok/b.s.tot);
  recentWrong.sort((a,b)=>(b.s.ts?.slice(-1)[0]||0)-(a.s.ts?.slice(-1)[0]||0));

  let h='';
  // Wrong answer key reporter (still useful, now prominent)
  const curQ=G.pool.length&&G.qi<G.pool.length?G.QZ[G.pool[G.qi]]:null;
  if(curQ){
    h+=`<div style="margin-bottom:12px;padding:10px;background:#fffbeb;border-radius:10px;border:1px solid #fde68a">
<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:6px">❌ Report wrong answer key for current question</div>
<input id="reportInput" class="search-box" placeholder="מה לדעתך התשובה הנכונה ולמה?" style="font-size:11px;margin-bottom:6px;direction:rtl">
<button class="btn" style="font-size:10px;width:100%;background:#d97706;color:#fff" data-action="submit-report" aria-label="Submit report for AI review">שלח לבדיקת AI</button>
<div id="fbStatus" style="font-size:10px;margin-top:4px;display:none"></div>
<div id="aiVerifyResult" style="display:none;margin-top:8px;padding:10px;border-radius:8px;font-size:10px;line-height:1.6"></div>
</div>`;
  }

  // Chronic failures
  if(chronic.length>0){
    h+=`<div style="font-weight:700;font-size:11px;margin-bottom:6px;color:#dc2626">🔴 Chronic Failures — read the chapter, not drill</div>`;
    chronic.slice(0,5).forEach(({idx,q,s})=>{
      const acc=Math.round(s.ok/s.tot*100);
      const topic=q.ti>=0?TOPICS_L[q.ti]:'';
      h+=`<div style="padding:8px;background:#fef2f2;border-radius:8px;margin-bottom:6px;cursor:pointer" data-action="goto-q" data-idx="${idx}" data-flip="1">
<div style="font-size:10px;font-weight:600;line-height:1.4">${q.q.slice(0,80)}${q.q.length>80?'…':''}</div>
<div style="display:flex;gap:8px;margin-top:4px"><span style="font-size:9px;color:#dc2626">${s.ok}/${s.tot} (${acc}%) · D=${s.fsrsD?s.fsrsD.toFixed(1):'?'}</span><span style="font-size:9px;color:#94a3b8">${topic}</span></div>
</div>`;
    });
  }

  // Recently wrong (last streak broken)
  const shown=recentWrong.slice(0,8);
  if(shown.length>0){
    h+=`<div style="font-weight:700;font-size:11px;margin-bottom:6px;margin-top:10px;color:#d97706">⚠️ Recently Wrong — retry these</div>`;
    shown.forEach(({idx,q,s})=>{
      const topic=q.ti>=0?TOPICS_L[q.ti]:'';
      h+=`<div style="padding:8px;background:#fffbeb;border-radius:8px;margin-bottom:4px;cursor:pointer" data-action="goto-q" data-idx="${idx}">
<div style="font-size:10px;line-height:1.4">${q.q.slice(0,75)}${q.q.length>75?'…':''}</div>
<div style="font-size:9px;color:#94a3b8;margin-top:2px">${topic}</div>
</div>`;
    });
  }

  if(!chronic.length&&!shown.length&&!curQ)h+='<div style="font-size:11px;color:#94a3b8;text-align:center;padding:20px">No data yet — answer some questions first</div>';
  return h;
}
export function toggleHarrisonAI(){
  const b=document.getElementById('harrison-ai-box');
  if(b)b.style.display=b.style.display==='none'?'block':'none';
}
export async function submitHarrisonAI(){
  const q=document.getElementById('harrison-ai-q')?.value?.trim();
  const ans=document.getElementById('harrison-ai-answer');
  if(!q||!ans)return;
  ans.style.display='block';ans.innerHTML='⏳ ...';
  const prompt=`You are an expert internist helping an Israeli internal medicine resident study Harrison's Internal Medicine 22e for the שלב א׳ internal medicine board exam (P0064-2025).

Question: ${q}

Answer in HEBREW (4-6 sentences). Cite the relevant Harrison chapter if known. Focus on internal medicine principles and what the exam is likely to test. If a specific threshold/criterion/number is asked, lead with it.`;
  try{
    const txt=await callAI([{role:'user',content:prompt}],600,'sonnet');
    ans.innerHTML=sanitize(txt);
    document.getElementById('harrison-ai-q').value='';
  }catch(e){ans.innerHTML='⚠️ Failed: '+sanitize(e.message);}
}
export async function aiSummarizeChapter(chNum,chTitle){
  const box=document.getElementById('quiz-me-box');
  if(!box)return;
  box.innerHTML='<div style="text-align:center;padding:16px;color:#64748b">⏳ מסכם את הפרק...</div>';
  let chText='';
  const harCh=G._harData&&G._harData[chNum];
  if(harCh&&harCh.sections){
    chText=harCh.sections.slice(0,8).map(s=>{
      const body=Array.isArray(s.content)?s.content.join(' '):(s.content||'');
      return s.title+(body?': '+body.slice(0,300):'');
    }).join('\n').slice(0,3500);
  }
  const prompt=`You are summarizing Harrison's Internal Medicine Ch ${chNum}: ${chTitle} for the Israeli internal medicine board exam (שלב א׳ פנימית).

Chapter content:
${chText||'Chapter '+chNum+': '+chTitle}

Create a board-focused summary in HEBREW with:
1. 5-7 key facts/thresholds the examiner will test (specific numbers, criteria)
2. 2-3 "exam traps" — common wrong answers and why they're wrong
3. One clinical pearl for internal medicine practice

Format as clean bullet points. Be concise and high-yield.`;
  try{
    const txt=await callAI([{role:'user',content:prompt}],800,'sonnet');
    box.innerHTML=`<div style="margin-top:12px;padding:14px;background:#f0fdf4;border-radius:10px;border-left:4px solid #059669">
<div style="font-weight:700;font-size:12px;color:#065f46;margin-bottom:8px">📝 Board Summary — Ch ${sanitize(String(chNum))}: ${sanitize(chTitle)}</div>
<div style="font-size:11px;line-height:1.8;direction:rtl;text-align:right;white-space:pre-wrap">${sanitize(txt)}</div>
</div>`;
  }catch(e){box.innerHTML='<div style="color:#dc2626;font-size:11px;padding:8px">⚠️ Failed: '+sanitize(e.message)+'</div>';}
}
// toggleAskAI removed — dead code
// submitAskAI removed — dead code
export async function quizMeOnChapter(chNum,chTitle){
  // Show loading state in Library
  const el=document.getElementById('quiz-me-box');
  // safe-innerhtml: chNum is always an integer from parseInt() / G.harChOpen — no user input path.
  if(el){el.innerHTML='<div style="text-align:center;padding:20px;color:#64748b">⏳ Generating questions from Ch '+chNum+'...</div>';}
  // Get chapter text from already-loaded data
  let chapterText='';
  const harCh=G._harData&&G._harData[chNum];
  if(harCh&&harCh.sections){
    chapterText=harCh.sections.slice(0,6).map(s=>{
      const body=Array.isArray(s.content)?s.content.join(' '):(s.content||'');
      return s.title+': '+body;
    }).join('\n').slice(0,3000);
  }
  if(!chapterText){
    chapterText="Harrison's Internal Medicine Chapter "+chNum+": "+chTitle;
  }
  const prompt=`You are an Israeli internal medicine board examiner writing MCQ for the שלב א׳ exam.

Based on this chapter content from Harrison's Internal Medicine Ch ${chNum} (${chTitle}):
${chapterText}

Generate 3 original MCQ questions NOT already in the question bank. Each question must:
1. Test a specific fact, threshold, or mechanism from this chapter
2. Have exactly 5 answer options (A-E)
3. Have one definitively correct answer
4. Include a brief Hebrew explanation (2-3 sentences)

Return ONLY valid JSON array:
[{"q":"question text","o":["A. opt","B. opt","C. opt","D. opt","E. opt"],"c":0,"e":"הסבר בעברית"}]
c = 0-based index of correct answer. No markdown, no preamble.`;
  try{
    const txt=await callAI([{role:'user',content:prompt}],1200,'sonnet');
    const clean=txt.replace(/\`\`\`json|\`\`\`/g,'').trim();
    const qs=JSON.parse(clean);
    // Display the generated questions
    let h='<div style="margin-top:16px;border-top:2px solid #7c3aed;padding-top:12px">';
    h+='<div style="font-weight:700;font-size:12px;color:#7c3aed;margin-bottom:10px">🧠 AI-Generated Questions — Ch '+sanitize(String(chNum))+': '+sanitize(chTitle)+'</div>';
    qs.forEach((q,idx)=>{
      h+=`<div style="margin-bottom:14px;padding:12px;background:#faf5ff;border-radius:10px;border-left:3px solid #7c3aed">`;
      h+=`<div style="font-size:12px;font-weight:600;margin-bottom:8px">${idx+1}. ${sanitize(q.q)}</div>`;
      q.o.forEach((opt,oi)=>{
        const isCorrect=oi===q.c;
        h+=`<div style="font-size:11px;padding:4px 8px;margin-bottom:3px;border-radius:6px;background:${isCorrect?'#dcfce7':'#f8fafc'};color:${isCorrect?'#166534':'#475569'};font-weight:${isCorrect?'700':'400'}">${sanitize(opt)}${isCorrect?' ✓':''}</div>`;
      });
      if(q.e)h+=`<div style="font-size:10px;color:#6d28d9;margin-top:8px;direction:rtl;text-align:right;line-height:1.6;border-top:1px solid #e9d5ff;padding-top:6px">💡 ${sanitize(q.e)}</div>`;
      h+='</div>';
    });
    _pendingAiQs=JSON.stringify(qs);h+='<button data-action="add-qs" style="font-size:10px;padding:6px 14px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:4px">➕ Add to my question bank</button>';
    h+='</div>';
    if(el)el.innerHTML=h;
  }catch(e){
    if(el)el.innerHTML='<div style="color:#dc2626;font-size:11px;padding:8px">⚠️ Failed to generate: '+sanitize(e.message)+'</div>';
  }
}
export function addChapterQsToBank(jsonStr){
  try{
    const qs=JSON.parse(jsonStr);
    const existing=JSON.parse(localStorage.getItem('pnimit_custom_qs')||'[]');
    qs.forEach(q=>{q.t='AI-Ch';q.ti=-1;existing.push(q);});
    localStorage.setItem('pnimit_custom_qs',JSON.stringify(existing));
    toast('✅ '+qs.length+' questions added! Reload to see them in the AI-Ch filter.','info');
  }catch(e){toast('Failed: '+e.message,'info');}
}
export function renderLibrary(){
let h=`<div class="sec-t">📖 Library</div>
<div class="sec-s">Harrison's 22e · Articles · Past Exams</div>`;
// Sub-tabs
const libTabs=[
{id:'harrison',l:'📗 Harrison',c:'#8b5cf6'},
{id:'articles',l:'📄 Articles',c:'#3b82f6'},
{id:'exams',l:'📝 Exams',c:'#06b6d4'}
];
h+=`<div style="display:flex;gap:4px;overflow-x:auto;padding:4px 0;margin-bottom:12px;-webkit-overflow-scrolling:touch">`;
libTabs.forEach(t=>{
h+=`<span class="pill ${G.libSec===t.id?'on':''}" style="white-space:nowrap;font-size:10px" data-action="lib-section" data-sec="${t.id}">${t.l}</span>`;
});
h+=`</div>`;

// ===== HARRISON IN-APP READER =====
if(G.libSec==='harrison'){
if(G.harChOpen!==null&&G._harData&&G._harData[String(G.harChOpen)]){
const ch=G._harData[String(G.harChOpen)];
const allSylChNums=[...SYL_HAR_ALL,...SYL_HAR_BASE].map(c=>c.ch).sort((a,b)=>a-b);
const curIdx=allSylChNums.indexOf(G.harChOpen);
const prevCh=curIdx>0?allSylChNums[curIdx-1]:null;
const nextCh=curIdx<allSylChNums.length-1?allSylChNums[curIdx+1]:null;
h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
<button data-action="close-chapter" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;font-size:11px;cursor:pointer">← Back</button>
<div style="font-size:12px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Ch ${G.harChOpen}: ${ch.title}</div>
</div>
<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
${prevCh?`<button data-action="open-chapter" data-ch="${prevCh}" style="font-size:10px;padding:5px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer">‹ Ch ${prevCh}</button>`:''}
<button data-action="quiz-chapter" style="font-size:10px;padding:5px 10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer">🧠 Quiz</button>
<button data-action="summarize-chapter" style="font-size:10px;padding:5px 10px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer">📝 Summary</button>
${nextCh?`<button data-action="open-chapter" data-ch="${nextCh}" style="font-size:10px;padding:5px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer">Ch ${nextCh} ›</button>`:''}
</div>
<div id="quiz-me-box"></div>
<div class="card" style="padding:16px">`;
// Feature 4: Show question stats for this topic in chapter reader
const _relTopics=Object.entries(TOPIC_REF).filter(([ti,ref])=>ref.s==='har').map(([ti])=>+ti);
const _chTopicIdx=_relTopics.find(ti=>{const ref=TOPIC_REF[ti];return ref&&String(ref.ch)===String(G.harChOpen);});
if(_chTopicIdx!==undefined){
const _ts=getTopicStats()[_chTopicIdx]||{ok:0,no:0,tot:0};
const _tpct=_ts.tot?Math.round(_ts.ok/_ts.tot*100):null;
const _tqCount=G.QZ.filter(q=>q.ti===_chTopicIdx).length;
h+=`<div style="display:flex;gap:8px;margin-bottom:12px;padding:8px 12px;background:#f5f3ff;border-radius:10px;font-size:10px;align-items:center">
<span>📝 ${_tqCount} questions on this topic</span>
${_tpct!==null?`<span style="font-weight:700;color:${_tpct>=70?'#059669':_tpct>=50?'#d97706':'#dc2626'}">${_tpct}% accuracy</span>`:'<span style="color:#94a3b8">Not attempted yet</span>'}
<button data-action="drill-topic" data-ti="${_chTopicIdx}" style="margin-left:auto;font-size:10px;padding:4px 10px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer">▶ Drill</button>
</div>`;
}
ch.sections.forEach(sec=>{
if(sec.title){h+=`<div style="font-size:13px;font-weight:800;color:#7c3aed;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #ede9fe">${sec.title}</div>`;}
sec.content.forEach(p=>{h+=`<p style="font-size:11.5px;line-height:1.9;color:#1e293b;margin:0 0 10px;text-align:justify">${p}</p>`;});
});
h+=`</div>`;
}else if(G._harLoading){
h+=`<div class="card" style="padding:40px;text-align:center"><div style="font-size:13px;color:#64748b">⏳ Loading Harrison's chapter...</div></div>`;
}else{
const allSylChs=[...SYL_HAR_ALL,...SYL_HAR_BASE].sort((a,b)=>a.ch-b.ch);
const allChNums=SYL_HAR_ALL.map(c=>c.ch);
h+=`<div class="card" style="padding:14px">
<div style="font-size:13px;font-weight:700;margin-bottom:4px">📗 Harrison's 22e — In-App Reader</div>
<div style="font-size:10px;color:#64748b;margin-bottom:12px">${allSylChs.length} required chapters · <span style="color:#7c3aed">purple</span> = all examinees · <span style="color:#06b6d4">teal</span> = base track only</div>`;
allSylChs.forEach(c=>{
const isAll=allChNums.includes(c.ch);
const harCh=G._harData&&G._harData[String(c.ch)];
const wc=harCh?`~${Math.round(harCh.wordCount/250)} min`:'tap to load';
h+=`<div data-action="open-chapter" data-ch="${c.ch}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer">
<span style="background:${isAll?'#7c3aed':'#06b6d4'};color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:8px;min-width:42px;text-align:center">Ch ${c.ch}</span>
<div style="flex:1;min-width:0">
<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.t}</div>
<div style="font-size:9px;color:#94a3b8;margin-top:2px">${wc}</div>
</div>
<span style="font-size:18px;color:#94a3b8">›</span></div>`;
});
h+=`</div>`;
}
}

// ===== LAWS =====
if(G.libSec==='laws'){
h+=`<div class="card" style="padding:14px">
<div style="font-size:13px;font-weight:700;margin-bottom:4px">⚖️ חוקים, נהלים ופרסומים</div>
<div class="heb" style="font-size:10px;color:#64748b;margin-bottom:10px">${SYL_LAWS.length} items</div>`;
SYL_LAWS.forEach((l,i)=>{
h+=`<div class="heb" style="padding:8px 0;border-bottom:1px solid #f1f5f9">
<div style="display:flex;align-items:flex-start;gap:8px">
<span style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;flex-shrink:0">${i+1}</span>
<div style="flex:1"><div style="font-size:11px;font-weight:600">${l.n}</div>
<div style="font-size:9px;color:#94a3b8;margin-top:2px">${l.s}</div></div>${l.f?`<a href="${l.f}" target="_blank" style="font-size:10px;padding:3px 7px;background:#fffbeb;color:#d97706;border-radius:6px;text-decoration:none;flex-shrink:0;white-space:nowrap">📄</a>`:''}</div></div>`;
});
h+=`</div>`;
}

// ===== ARTICLES =====
if(G.libSec==='articles'){
h+=`<div class="card" style="padding:14px">
<div style="font-size:13px;font-weight:700;margin-bottom:4px">📄 Required Articles</div>
<div style="font-size:10px;color:#64748b;margin-bottom:10px">${SYL_ARTICLES.length} journal articles</div>`;
const _artMap={"0":"articles/01_digitoxin_hfref.pdf","1":"articles/02_cfdna_crc_screening.pdf","2":"articles/03_bsi_7vs14_days.pdf","3":"articles/04_aspirin_ccs_oac.pdf","4":"articles/05_baxdrostat_htn.pdf","5":"articles/06_apixaban_vte.pdf","6":"articles/07_upadacitinib_gca.pdf","7":"articles/08_sarcoidosis_pred_mtx.pdf","8":"articles/09_sotatercept_pah.pdf","9":"articles/10_ecst2_carotid.pdf"};
SYL_ARTICLES.forEach((a,i)=>{
const _apdf=_artMap[String(i)];
h+=`<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:8px">
<div style="flex:1"><div style="font-size:11px;font-weight:600;line-height:1.5">${i+1}. ${a.t}</div>
<div style="font-size:9px;color:rgb(var(--sky));margin-top:2px">${a.j}</div></div>${_apdf?`<a href="${_apdf}" download style="font-size:10px;padding:3px 7px;background:#eff6ff;color:#3b82f6;border-radius:6px;text-decoration:none;flex-shrink:0">📄</a>`:''}</div>`;
});
h+=`</div>`;
}

// ===== EXAMS =====
if(G.libSec==='exams'){
const examYears=[...new Set(G.QZ.map(q=>q.t))].sort();
h+=`<div class="card" style="padding:14px">
<div style="font-size:13px;font-weight:700;margin-bottom:4px">📝 Past Exams in Question Bank</div>
<div style="font-size:10px;color:#64748b;margin-bottom:10px">${G.QZ.length} questions from ${examYears.length} exam sessions</div>`;
examYears.forEach(yr=>{
const cnt=G.QZ.filter(q=>q.t===yr).length;
h+=`<div data-action="filter-year" data-yr="${yr}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer">
<span style="background:#06b6d4;color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:8px;min-width:60px;text-align:center">${yr}</span>
<span style="font-size:11px;flex:1">${cnt} questions</span>
<span style="font-size:14px;color:#94a3b8">›</span></div>`;
});
h+=`</div>`;
}

h+=`<div style="text-align:center;margin-top:12px;font-size:9px;color:#94a3b8">
<a href="syllabus/P0064-2025.pdf" target="_blank" style="color:rgb(var(--sky));text-decoration:underline">P0064-2025 Syllabus ↗</a></div>`;
h+=`<div style="text-align:center;margin-top:8px;padding:8px;font-size:9px;color:#94a3b8;line-height:1.5">
صدقة جارية الى من نحب<br>Ceaseless Charity — To the People That We Love</div>`;
return h;
}



export async function openHarrisonChapter(ch){
G.harChOpen=ch;
trackChapterRead('har',ch);
if(G._harData){G.render();return;}
if(G._harLoading)return;
G._harLoading=true;
G.render();
try{
const r=await fetch('harrison_chapters.json');
G._harData=await r.json();
}catch(e){
console.error('Failed to load Harrison chapters',e);
G._harData={};
}
G._harLoading=false;
G.render();
}

// ===== FLASHCARDS =====


// Event delegation for Library tab — set up once on #ct container
export function initLibraryEvents(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'submit-report') {
      G.S._reportType = 'wrong_answer';
      submitReport();
    }
    else if (action === 'goto-q') {
      const idx = parseInt(el.dataset.idx, 10);
      G.filt = 'all'; G.pool = [idx]; G.qi = 0;
      G.sel = null; G.ans = false;
      if (el.dataset.flip) G.flipRevealed = false;
      G.tab = 'quiz'; G.render();
    }
    else if (action === 'add-qs') {
      if (_pendingAiQs) addChapterQsToBank(_pendingAiQs);
    }
    else if (action === 'lib-section') {
      G.libSec = el.dataset.sec; G.render();
    }
    else if (action === 'close-chapter') {
      G.harChOpen = null; G.render();
    }
    else if (action === 'open-chapter') {
      openHarrisonChapter(parseInt(el.dataset.ch, 10));
    }
    else if (action === 'quiz-chapter') {
      const ch = G._harData && G._harData[String(G.harChOpen)];
      if (ch) quizMeOnChapter(G.harChOpen, ch.title);
    }
    else if (action === 'summarize-chapter') {
      const ch = G._harData && G._harData[String(G.harChOpen)];
      if (ch) aiSummarizeChapter(G.harChOpen, ch.title);
    }
    else if (action === 'drill-topic') {
      const ti = parseInt(el.dataset.ti, 10);
      G.tab = 'quiz'; G.filt = 'topic'; G.topicFilt = ti;
      buildPool(); G.render();
    }
    else if (action === 'filter-year') {
      G.tab = 'quiz'; G.filt = el.dataset.yr;
      buildPool(); G.render();
    }
  });
}
