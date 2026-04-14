// More view — renderSearch, showAnswerHardFail, renderChat, sendChat

let srchQ='';
function renderSearch(){
let h=`<div class="sec-t">🔍 Search</div><div class="sec-s">Search across all ${QZ.length} questions + ${NOTES.length} study notes + ${DRUGS.length} drugs</div>`;
h+=`<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
<input class="search-box" style="margin-bottom:0;flex:1" placeholder="Type to search..." oninput="srchQ=this.value;render()" value="${srchQ}" id="srchi">
<button class="voice-btn${voiceListening?' listening':''}" onclick="startVoiceParser()" aria-label="${voiceListening?'Stop voice input':'Start voice input'}">${voiceListening?'🔴 Listening...':'🎤 Voice'}</button>
</div>`;
if(voiceTranscript&&srchQ){h+=`<div style="font-size:10px;color:#64748b;margin-bottom:8px;padding:6px 10px;background:#f8fafc;border-radius:8px" dir="auto">🎤 "${voiceTranscript}"</div>`;}
if(srchQ.length>=2){
const q=srchQ.toLowerCase();
// Search questions
const qRes=[];QZ.forEach((item,i)=>{if(item.q.toLowerCase().includes(q)||item.o.some(o=>o.toLowerCase().includes(q)))qRes.push(i);});
// Search notes
const nRes=NOTES.filter(n=>n.topic.toLowerCase().includes(q)||n.notes.toLowerCase().includes(q));
// Search drugs
const dRes=DRUGS.filter(d=>d.name.toLowerCase().includes(q)||d.heb.includes(q)||d.risk.toLowerCase().includes(q));

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
qRes.slice(0,15).forEach(i=>{h+=`<div class="card heb" dir="rtl" style="padding:10px;font-size:11px;line-height:1.5"><span class="badge" style="background:${QZ[i].t==='Harrison'?'#faf5ff':'#eff6ff'};color:${QZ[i].t==='Harrison'?'#7c3aed':'#1d4ed8'}">${QZ[i].t==='Harrison'?'🤖 AI':'📝 '+QZ[i].t}</span> ${QZ[i].q.substring(0,120)}...</div>`;});
}
}
return h;
}

// ===== WARD MODE RENDER =====





// ===== RENDER =====
let lastTab=null;
function showAnswerHardFail(){
if(ans)return;
const q=QZ[pool[qi]];
sel=q.c;ans=true;
if(!examMode){
S.qNo++;
if(q.ti>=0){if(!S.tpNo)S.tpNo={};if(!S.tpNo[q.ti])S.tpNo[q.ti]=0;S.tpNo[q.ti]++;}
const _srk=String(pool[qi]);
if(!S.sr[_srk])S.sr[_srk]={ef:2.5,n:0,next:0};
S.sr[_srk].ef=Math.max(1.3,(S.sr[_srk].ef||2.5)-0.3);
S.sr[_srk].n=0;S.sr[_srk].next=Date.now();
}
save();render();
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
let chatLoading=false;

function renderChat(){
let h='<div class="sec-t">💬 AI Chat</div><div class="sec-s">Claude-powered Internal Medicine Q&A — board prep focus</div>';
h+='<div class="card" style="display:flex;flex-direction:column;height:calc(100vh - 200px);overflow:hidden">';
h+='<div class="chat-disclaimer" style="margin:10px 10px 0">⚠️ AI mentor — not a substitute for clinical judgment. For board prep use only.</div>';
if(S.chat.length>0){h+='<div style="padding:4px 10px;text-align:left"><button onclick="clearChat()" style="font-size:10px;color:#94a3b8;background:none;border:none;cursor:pointer" aria-label="Clear chat history">🗑 נקה שיחה</button></div>';}
h+='<div class="chat-msgs" id="chat-msgs">';
if(S.chat.length===0){
h+='<div style="padding:8px 4px 12px"><div class="heb" style="font-size:11px;color:#64748b;margin-bottom:10px;text-align:right">התחל שיחה — בחר נושא או כתוב שאלה חופשית:</div>';
CHAT_STARTERS.forEach(function(s){h+='<button class="chat-starter" onclick="sendChatStarter(this.getAttribute(\'data-t\'))" data-t="'+s.replace(/"/g,'&quot;')+'">' +sanitize(s)+'</button>';});
h+='</div>';
}else{
S.chat.forEach(function(m){
var cls=m.role==='user'?'chat-msg-user':m.role==='error'?'chat-msg-err':'chat-msg-ai';
if(m.role==='user'){h+='<div class="'+cls+' heb" dir="rtl" style="text-align:right">'+sanitize(m.text)+'</div>';}
else{h+='<div class="'+cls+'">'+sanitize(m.text)+'</div>';}
});
if(chatLoading){h+='<div class="chat-msg-ai" style="padding:6px 12px"><div class="typing-dots"><span></span><span></span><span></span></div></div>';}
}
h+='</div>';
h+='<div class="chat-input-row">';
h+='<textarea id="chat-input" placeholder="שאל שאלה ברפואה פנימית..." rows="2" aria-label="Chat input" style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:12px;resize:none;font-family:Heebo,sans-serif;direction:rtl;text-align:right;background:inherit;color:inherit" onkeydown="if(event.key===&apos;Enter&apos;&&!event.shiftKey){event.preventDefault();sendChat()}"></textarea>';
h+='<button class="btn btn-p" onclick="sendChat()" '+(chatLoading?'disabled':'')+' style="align-self:flex-end;min-width:52px" aria-label="Send">שלח</button>';
h+='</div>';
h+='</div>';
return h;
}

async function sendChat(){
const input=document.getElementById('chat-input');
const text=(input?input.value:'').trim();
if(!text||chatLoading)return;
const key=getApiKey();
if(!key){const k=prompt('הכנס Anthropic API Key:','');if(!k)return;setApiKey(k);}
S.chat.push({role:'user',text:text});
chatLoading=true;save();render();
setTimeout(function(){const el=document.getElementById('chat-msgs');if(el)el.scrollTop=el.scrollHeight;},50);
let history=S.chat.slice(-10);
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
S.chat.push({role:'assistant',text:data.content[0].text});
}catch(e){
const offline=!navigator.onLine||e.message.includes('Failed to fetch');
const timedOut=e.name==='AbortError';
S.chat.push({role:'error',text:offline?'📡 אין חיבור לאינטרנט':timedOut?'⏱️ תם הזמן':'⚠️ '+sanitize(e.message)});
}
chatLoading=false;save();render();
setTimeout(function(){const el=document.getElementById('chat-msgs');if(el)el.scrollTop=el.scrollHeight;},50);
}

function sendChatStarter(text){const input=document.getElementById('chat-input');if(input)input.value=text;sendChat();}
function clearChat(){S.chat=[];chatLoading=false;save();render();}
