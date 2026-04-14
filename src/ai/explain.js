import G from '../core/globals.js';
import { sanitize } from '../core/utils.js';
import { callAI } from './client.js';

// AI explain, autopsy, teach-back — extracted from pnimit-mega.html
// Depends on: callAI (client.js), sanitize (utils.js), G.S, save (state.js), G.QZ (data)

// ===== TEACH-BACK =====
// ===== AI EXPLAIN =====
// G._exCache init
try{G._exCache=JSON.parse(localStorage.getItem('pnimit_ex')||'{}')}catch(e){}
export function toggleFlagExplain(qIdx){
  if(!G.S.flagged)G.S.flagged={};
  G.S.flagged[qIdx]=!G.S.flagged[qIdx];
  if(!G.S.flagged[qIdx])delete G.S.flagged[qIdx];
  save();
  // Re-G.render just the explain container
  const el=document.getElementById('ai-explain-'+qIdx);
  if(el){G._exLoading=false;G._exIdx=-1;renderExplainBox(qIdx);}
}
export function renderExplainBox(qIdx){
  var container=document.getElementById('ai-explain-'+qIdx);
  if(!container)return;
  if(G._exLoading&&G._exIdx===qIdx){container.innerHTML='<div style="color:#64748b;font-size:11px;padding:8px 0">⏳ מחשב הסבר...</div>';return;}
  var ex=G._exCache[qIdx];
  if(!ex)return;
  if(ex.err){container.innerHTML='<div style="color:#dc2626;font-size:11px;padding:8px 0">⚠️ '+sanitize(ex.err)+'</div>';return;}
  const _isFlagged=(G.S.flagged||{})[qIdx];
  container.innerHTML='<div class="explain-box" style="margin-top:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:11px;line-height:1.7;color:#166534;direction:rtl;text-align:right"><div style="font-weight:700;margin-bottom:4px">🤖 הסבר AI</div><div>'+sanitize(ex.text)+'</div></div>'+
    '<button onclick="toggleFlagExplain('+qIdx+')" style="font-size:9px;padding:2px 8px;margin-top:3px;background:'+(_isFlagged?'#fef2f2':'#f8fafc')+';color:'+(_isFlagged?'#dc2626':'#94a3b8')+';border:1px solid '+(_isFlagged?'#fecaca':'#e2e8f0')+';border-radius:6px;cursor:pointer">'+(_isFlagged?'⚑ Flagged — verify':'⚐ Flag as unreliable')+'</button>';
}
async export function explainWithAI(qIdx){
  if(G._exCache[qIdx]&&!G._exCache[qIdx].err){setTimeout(function(){renderExplainBox(qIdx);},0);return;}
  G._exLoading=true;G._exIdx=qIdx;renderExplainBox(qIdx);
  var q=G.QZ[qIdx];
  var correct=q.o[q.c];
  try{
    // Feature 8: Detect language — bilingual if question has English terms
    var _qLang=(q.q.match(/[a-zA-Z]/g)||[]).length/q.q.length>0.25?'en':'he';
    var _langInstr=_qLang==='en'?'Explain in English (3-4 sentences) why this is the correct answer. Be concise and exam-focused.':'הסבר בעברית (3-4 משפטים) למה זו התשובה הנכונה לשאלה הבאה מתחום הרפואה הפנימית. עגן תמיד בתשובה הנכונה הנל.';
    var txt=await callAI([{role:'user',content:'ANSWER KEY: The correct answer is DEFINITIVELY "'+correct+'".\n\n'+_langInstr+'\n\nשאלה: '+q.q+'\nאפשרויות: '+q.o.join(' / ')+'\nתשובה נכונה: '+correct}],400,'sonnet');
    G._exCache[qIdx]={text:txt};
    localStorage.setItem('pnimit_ex',JSON.stringify(G._exCache));
  }catch(e){
    G._exCache[qIdx]={err:e.message==='no_key'?'AI unavailable — set API key in Track':e.message};
  }
  G._exLoading=false;G._exIdx=-1;
  setTimeout(function(){renderExplainBox(qIdx);},0);
}

async export function aiAutopsy(qIdx){
const q=G.QZ[qIdx];
const _apKey='autopsy_'+qIdx;
G._exCache[_apKey]='<div style="color:#64748b">⏳ AI analyzing each option...</div>';
G.render();
try{
const wrongOpts=q.o.filter((_,i)=>i!==q.c);
const txt=await callAI([{role:'user',content:`Internal medicine board exam question. For EACH wrong option, explain in 1-2 sentences why it's wrong HERE and when it WOULD be correct.

Question: ${q.q}
Correct: ${q.o[q.c]}
Wrong options: ${wrongOpts.join(' | ')}

Format each as:
✗ [option] — Wrong because: [reason]. Would be correct if: [scenario].

Be concise. Use English for medical terms, Hebrew for context if relevant.`}],500);
// Sanitize AI output first, then format
const safeTxt=sanitize(txt);
const formatted=safeTxt.replace(/✗/g,'<b style="color:#dc2626">✗</b>')
  .replace(/Wrong because:/g,'<span style="color:#b91c1c">Wrong because:</span>')
  .replace(/Would be correct if:/g,'<span style="color:#059669">Would be correct if:</span>')
  .replace(/\n/g,'<br>');
G._exCache[_apKey]=formatted;
localStorage.setItem('pnimit_ex',JSON.stringify(G._exCache));
}catch(e){
G._exCache[_apKey]='<span style="color:#dc2626">Error: '+sanitize(e.message).substring(0,40)+'</span>';
}
G.render();
}

export function startVoiceTeachBack(){
  const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRec){alert('קול לא נתמך בדפדפן זה');return;}
  const rec=new SpeechRec();
  rec.lang='he-IL';
  rec.continuous=false;
  rec.interimResults=false;
  const btn=document.getElementById('tb-mic-btn');
  const inp=document.getElementById('tbInput');
  if(!inp){alert('עדכן את הדף');return;}
  if(btn){btn.textContent='🔴';btn.disabled=true;}
  rec.onresult=function(e){
    const transcript=e.results[0][0].transcript;
    inp.value=(inp.value?inp.value+' ':'')+transcript;
    if(btn){btn.textContent='🎙️';btn.disabled=false;}
  };
  rec.onerror=function(){if(btn){btn.textContent='🎙️';btn.disabled=false;}};
  rec.onend=function(){if(btn){btn.textContent='🎙️';btn.disabled=false;}};
  rec.start();
}
async export function gradeTeachBack(qIdx,userExplanation){
G.teachBackState='grading';G.render();
const q=G.QZ[qIdx];
const correctOption=q.o[q.c];
try{
const teachBackRubric=`You are an Israeli internal medicine board examiner grading a resident\'s teach-back.
RUBRIC (score all 3 axes, then give final score):
1. MECHANISM: Does the student explain WHY this is correct (pathophysiology/mechanism)? (0=no, 1=yes)
2. CRITERIA: Does the student cite the key criterion/definition/threshold (e.g. specific numbers, guideline criteria)? (0=no, 1=yes)
3. EXCEPTION: Does the student mention at least one important exception, caveat, or when this would NOT apply? (0=no, 1=yes)
FINAL SCORE: 3=all 3 axes correct (excellent), 2=any 2 correct (partial), 1=0-1 correct (needs work).
Respond ONLY with valid JSON: {"score":N,"mechanism":0or1,"criteria":0or1,"exception":0or1,"feedback":"2 sentences in Hebrew — what was good and what is missing"}`;
const txt=await callAI([{role:'user',content:teachBackRubric+'\n\nQuestion: '+q.q+'\nCorrect answer: '+correctOption+'\nStudent explanation: '+userExplanation}],400,'sonnet');
const jsonMatch=txt.match(/\{[\s\G.S]*\}/);
const parsed=jsonMatch?JSON.parse(jsonMatch[0]):{};
G.teachBackState={score:parsed.score||1,feedback:parsed.feedback||'לא התקבל משוב — נסה שוב'};
}catch(e){
G.teachBackState={score:null,feedback:'⚠️ '+(e.message==='no_key'?'AI unavailable':e.message)};
}
G.render();
}
