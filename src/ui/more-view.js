import G from '../core/globals.js';
import { sanitize, toast, heDir } from '../core/utils.js';
import { callAI } from '../ai/client.js';
import { AI_PROXY, AI_SECRET } from '../core/constants.js';
import { startVoiceParser } from '../quiz/modes.js';
import { submitFeedbackForm } from '../features/cloud.js';

export function renderNotes(){
  const qnoteEntries=Object.entries(G.S.qnotes||{}).filter(([k,v])=>v&&v.trim());
  let h='<div class="sec-t">📝 Notes</div><div class="sec-s">כתוב הערות אישיות ומחשבות ללימוד — נשמר אוטומטית בדפדפן</div>';
  h+=`<div style="padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:8px">📓 פנקס כללי</div>
    <textarea id="gnotes-ta" dir="auto" placeholder="כתוב הערות, רשמים, פרלים מרפואה... הכל נשמר בדפדפן שלך."
      style="width:100%;min-height:180px;resize:vertical;font-family:Heebo,Inter,sans-serif;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:12px;line-height:1.7;background:#fff;color:#0f172a">${sanitize(G.S.gnotes||'')}</textarea>
    <div style="display:flex;gap:6px;margin-top:8px;align-items:center">
      <button class="btn btn-p" data-action="save-gnotes" style="flex:1;font-size:11px;min-height:40px">💾 שמור</button>
      <button class="btn" data-action="export-gnotes" style="font-size:11px;min-height:40px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0">📤 ייצא</button>
      <span id="gnotes-status" style="font-size:10px;color:#94a3b8;margin-right:auto"></span>
    </div>
  </div>`;
  h+=`<div class="sec-t" style="font-size:13px">🔖 הערות על שאלות (${qnoteEntries.length})</div>`;
  if(!qnoteEntries.length){
    h+='<div class="empty">אין הערות על שאלות עדיין. בעת מענה, לחץ על 📝 כדי להוסיף הערה.</div>';
  } else {
    h+='<div style="display:flex;flex-direction:column;gap:8px">';
    qnoteEntries.forEach(([idx,txt])=>{
      const q=G.QZ[idx];if(!q)return;
      const preview=(q.q||'').slice(0,80);
      h+=`<div style="padding:10px;background:#fff;border:1px solid #e2e8f0;border-radius:10px">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;text-align:right" dir="${heDir(preview)}">${sanitize(preview)}${q.q.length>80?'…':''}</div>
        <div style="font-size:11px;color:#0f172a;text-align:right;line-height:1.6;margin-bottom:6px;white-space:pre-wrap" dir="${heDir(txt)}">${sanitize(txt)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn" data-action="jump-to-q" data-idx="${idx}" style="font-size:10px;padding:6px 10px;min-height:32px;background:var(--app-primary);color:var(--app-on-primary)">↵ עבור לשאלה</button>
          <button class="btn" data-action="del-qnote-idx" data-idx="${idx}" style="font-size:10px;padding:6px 10px;min-height:32px;background:#fef2f2;color:#991b1b">🗑️ מחק</button>
        </div>
      </div>`;
    });
    h+='</div>';
  }
  return h;
}
export function saveGNotes(){
  const t=document.getElementById('gnotes-ta');if(!t)return;
  G.S.gnotes=t.value;G.save();
  const st=document.getElementById('gnotes-status');
  if(st){st.textContent='✓ נשמר '+new Date().toLocaleTimeString('he-IL');setTimeout(()=>{if(st)st.textContent='';},2500);}
}
export function exportGNotes(){
  const blob=new Blob([G.S.gnotes||''],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='pnimit-notes-'+new Date().toISOString().slice(0,10)+'.txt';
  a.click();URL.revokeObjectURL(a.href);
  toast('הערות יוצאו','success');
}
export function delQNoteByIdx(idx){
  if(G.S.qnotes)delete G.S.qnotes[idx];
  G.save();G.render();
}
export function jumpToQuestion(idx){
  G.tab='quiz';
  let pos=G.pool.indexOf(idx);
  if(pos<0){G.filt='all';G.topicFilt=-1;G.years=[];
    // Rebuild pool
    G.pool=[];G.QZ.forEach((_,i)=>G.pool.push(i));
    pos=G.pool.indexOf(idx);if(pos<0)pos=0;
  }
  G.qi=pos;G.sel=null;G.ans=false;G.render();
}

export function renderSearch(){
let h=`<div class="sec-t">🔍 Search</div><div class="sec-s">Search across all ${G.QZ.length} questions + ${G.NOTES.length} study notes + ${G.DRUGS.length} drugs</div>`;
h+=`<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
<input class="search-box" style="margin-bottom:0;flex:1" placeholder="Type to search..." data-action="search-input" value="${G.srchQ}" id="srchi">
<button class="voice-btn${G.voiceListening?' listening':''}" data-action="voice-parser" aria-label="${G.voiceListening?'Stop voice input':'Start voice input'}">${G.voiceListening?'🔴 Listening...':'🎤 Voice'}</button>
</div>`;
if(G.voiceTranscript&&G.srchQ){h+=`<div style="font-size:10px;color:#64748b;margin-bottom:8px;padding:6px 10px;background:#f8fafc;border-radius:8px" dir="auto">🎤 "${G.voiceTranscript}"</div>`;}
if(G.srchQ.length>=2){
const q=G.srchQ.toLowerCase();
// Search questions
const qRes=[];G.QZ.forEach((item,i)=>{if(item.q.toLowerCase().includes(q)||item.o.some(o=>o.toLowerCase().includes(q)))qRes.push(i);});
// Search notes
const nRes=G.NOTES.filter(n=>n.topic.toLowerCase().includes(q)||n.notes.toLowerCase().includes(q));
// Search drugs
const dRes=G.DRUGS.filter(d=>d.name.toLowerCase().includes(q)||d.heb.includes(q)||d.risk.toLowerCase().includes(q));

h+=`<div style="font-size:11px;color:#64748b;margin-bottom:10px">${qRes.length} questions · ${nRes.length} topics · ${dRes.length} drugs</div>`;

if(nRes.length){
h+=`<div style="font-weight:700;font-size:12px;margin-bottom:6px">📚 Study Notes</div>`;
nRes.forEach(n=>{h+=`<div class="card" style="padding:10px"><div style="font-weight:700;font-size:11px">${n.topic}</div><div style="font-size:10px;color:#475569;margin-top:4px;line-height:1.6">${n.notes.substring(0,200)}...</div></div>`;});
}
if(dRes.length){
h+=`<div style="font-weight:700;font-size:12px;margin:8px 0 6px">💊 Drugs</div>`;
dRes.forEach(d=>{h+=`<div class="card" style="padding:10px"><span style="font-weight:700;font-size:11px">${d.name}</span> ${d.beers?'<span class="badge badge-r">BEERS</span>':''}<div style="font-size:10px;color:#475569;margin-top:2px">${d.risk}</div></div>`;});
}
if(qRes.length){
h+=`<div style="font-weight:700;font-size:12px;margin:8px 0 6px">📝 Questions (${Math.min(qRes.length,15)} shown)</div>`;
qRes.slice(0,15).forEach(i=>{h+=`<div class="card heb" dir="${heDir(G.QZ[i].q)}" style="padding:10px;font-size:11px;line-height:1.5"><span class="badge" style="background:${G.QZ[i].t==='Harrison'?'#faf5ff':'#eff6ff'};color:${G.QZ[i].t==='Harrison'?'#7c3aed':'#1d4ed8'}">${G.QZ[i].t==='Harrison'?'🤖 AI':'📝 '+G.QZ[i].t}</span> ${G.QZ[i].q.substring(0,120)}...</div>`;});
}
}
return h;
}

// ===== WARD MODE RENDER =====





// ===== RENDER =====
export function showAnswerHardFail(){
if(G.ans)return;
const q=G.QZ[G.pool[G.qi]];
G.sel=q.c;G.ans=true;
if(!G.examMode){
G.S.qNo++;
if(q.ti>=0){if(!G.S.tpNo)G.S.tpNo={};if(!G.S.tpNo[q.ti])G.S.tpNo[q.ti]=0;G.S.tpNo[q.ti]++;}
const _srk=String(G.pool[G.qi]);
if(!G.S.sr[_srk])G.S.sr[_srk]={ef:2.5,n:0,next:0};
G.S.sr[_srk].ef=Math.max(1.3,(G.S.sr[_srk].ef||2.5)-0.3);
G.S.sr[_srk].n=0;G.S.sr[_srk].next=Date.now();
}
G.save();G.render();
}

// ===== AI CHAT =====
const CHAT_STARTERS=[
'מה ההבדל בין דמנציה לדליריום?',
'תסביר על תסמונת השברירות (frailty)',
'מה הגישה האבחנתית לאנמיה נורמוציטית?',
'תרופות שיש להימנע מהן בקשישים (Beers)',
'מה הגישה לנפילות בקשיש?',
];
const CHAT_SYSTEM="You are a senior internist and mentor at Shaare Zedek Medical Center in Jerusalem. The user is an internal medicine resident preparing for their Stage A board exam (P0064-2025). Answer in the same language as the question (Hebrew or English). Be concise, clinically precise. Focus on Harrison's 22e and the 10 required NEJM/Lancet articles. Emphasize pathophysiology, evidence-based management, and exam-tested thresholds.";

export function renderChat(){
let h='<div class="sec-t">💬 AI Chat</div><div class="sec-s">Claude-powered Internal Medicine Q&A — board prep focus</div>';
h+='<div class="card" style="display:flex;flex-direction:column;height:calc(100vh - 200px);overflow:hidden">';
h+='<div class="chat-disclaimer" style="margin:10px 10px 0">⚠️ AI mentor — not a substitute for clinical judgment. For board prep use only.</div>';
if(G.S.chat.length>0){h+='<div style="padding:4px 10px;text-align:left"><button data-action="clear-chat" style="font-size:10px;color:#94a3b8;background:none;border:none;cursor:pointer" aria-label="Clear chat history">🗑 נקה שיחה</button></div>';}
h+='<div class="chat-msgs" id="chat-msgs">';
if(G.S.chat.length===0){
h+='<div style="padding:8px 4px 12px"><div class="heb" style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:right">התחל שיחה — בחר נושא או כתוב שאלה חופשית:</div>';
CHAT_STARTERS.forEach(function(s){h+='<button class="chat-starter" data-action="chat-starter" data-t="'+s.replace(/"/g,'&quot;')+'">' +sanitize(s)+'</button>';});
h+='</div>';
}else{
G.S.chat.forEach(function(m){
var cls=m.role==='user'?'chat-msg-user':m.role==='error'?'chat-msg-err':'chat-msg-ai';
if(m.role==='user'){h+='<div class="'+cls+' heb" dir="'+heDir(m.text)+'" style="text-align:right">'+sanitize(m.text)+'</div>';}
else{h+='<div class="'+cls+'" dir="'+heDir(m.text)+'" style="unicode-bidi:plaintext">'+sanitize(m.text)+'</div>';}
});
if(G.chatLoading){h+='<div class="chat-msg-ai" style="padding:6px 12px"><div class="typing-dots"><span></span><span></span><span></span></div></div>';}
}
h+='</div>';
h+='<div class="chat-input-row">';
h+='<textarea id="chat-input" placeholder="שאל שאלה ברפואה פנימית..." rows="2" aria-label="Chat input" style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:12px;resize:none;font-family:Heebo,sans-serif;direction:rtl;text-align:right;background:inherit;color:inherit" data-action="chat-input"></textarea>';
h+='<button class="btn btn-p" data-action="send-chat" '+(G.chatLoading?'disabled':'')+' style="align-self:flex-end;min-width:52px" aria-label="Send">שלח</button>';
h+='</div>';
h+='</div>';
return h;
}

export async function sendChat(){
const input=document.getElementById('chat-input');
const text=(input?input.value:'').trim();
if(!text||G.chatLoading)return;
// Removed: proxy has its own x-api-secret; no user key needed to chat.
// (User key is still used by callAI() as fallback if the proxy fails.)
G.S.chat.push({role:'user',text:text});
G.chatLoading=true;G.save();G.render();
setTimeout(function(){const el=document.getElementById('chat-msgs');if(el)el.scrollTop=el.scrollHeight;},50);
let history=G.S.chat.slice(-10);
if(history.length>0&&history[0].role!=='user')history=history.slice(1);
const messages=history.filter(function(m){return m.role==='user'||m.role==='assistant';}).map(function(m){return{role:m.role,content:m.text};});
try{
const ctrl=new AbortController();
const timeout=setTimeout(function(){ctrl.abort();},45000);
const resp=await fetch(AI_PROXY,{
method:'POST',
headers:{'Content-Type':'application/json','x-api-secret':AI_SECRET},
body:JSON.stringify({model:'sonnet',max_tokens:1024,system:CHAT_SYSTEM,messages:messages}),
signal:ctrl.signal
});
clearTimeout(timeout);
if(!resp.ok){const e=await resp.json().catch(function(){return{};});if(resp.status===401||resp.status===403){localStorage.removeItem('pnimit_apikey');throw new Error('API key invalid');}throw new Error(e.error&&e.error.message?e.error.message:'HTTP '+resp.status);}
const data=await resp.json();
G.S.chat.push({role:'assistant',text:data.content[0].text});
}catch(e){
const offline=!navigator.onLine||e.message.includes('Failed to fetch');
const timedOut=e.name==='AbortError';
G.S.chat.push({role:'error',text:offline?'📡 אין חיבור לאינטרנט':timedOut?'⏱️ תם הזמן':'⚠️ '+sanitize(e.message)});
}
G.chatLoading=false;G.save();G.render();
setTimeout(function(){const el=document.getElementById('chat-msgs');if(el)el.scrollTop=el.scrollHeight;},50);
}

export function sendChatStarter(text){const input=document.getElementById('chat-input');if(input)input.value=text;sendChat();}
export function clearChat(){G.S.chat=[];G.chatLoading=false;G.save();G.render();}


// Event delegation for More tab — set up once on #ct container
export function initMoreEvents(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'voice-parser') { startVoiceParser(); }
    else if (action === 'clear-chat') { clearChat(); }
    else if (action === 'chat-starter') { const t = btn.getAttribute('data-t'); if (t) sendChatStarter(t); }
    else if (action === 'send-chat') { sendChat(); }
    else if (action === 'submit-feedback') { submitFeedbackForm(); }
    else if (action === 'save-gnotes') { saveGNotes(); }
    else if (action === 'export-gnotes') { exportGNotes(); }
    else if (action === 'jump-to-q') { jumpToQuestion(parseInt(btn.dataset.idx, 10)); }
    else if (action === 'del-qnote-idx') { delQNoteByIdx(btn.dataset.idx); }
  });
  container.addEventListener('input', (e) => {
    if (e.target.dataset.action === 'search-input') {
      G.srchQ = e.target.value;
      G.render();
    }
  });
  container.addEventListener('keydown', (e) => {
    if (e.target.dataset.action === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
}
