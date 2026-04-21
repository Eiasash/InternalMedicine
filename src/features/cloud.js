import G from '../core/globals.js';
import { SUPA_URL, SUPA_ANON, TOPICS, APP_VERSION } from '../core/constants.js';
import { sanitize, fmtT, toast } from '../core/utils.js';
import { callAI } from '../ai/client.js';
import { calcEstScore } from '../ui/track-view.js';
import { getTopicStats, getDueQuestions } from '../sr/spaced-repetition.js';

// Cloud sync, leaderboard, feedback, diagnostics — extracted from pnimit-mega.html
// Depends on: SUPA_URL, SUPA_ANON (constants.js), G.S, G.save (state.js),
//   G.QZ, TOPICS (constants.js), getTopicStats (sr), callAI (client.js), sanitize (utils.js)

// ===== SUPABASE CLOUD SYNC =====
// ===== FEATURE: LEADERBOARD =====
// Guard: calcEstScore() returns a 60% neutral default for topics with <3 answers.
// For users with thin data, readiness collapses to ~60, polluting the global board.
// Require min answered + real calcEstScore result before submitting.
const LB_MIN_ANSWERED=20;
export async function submitLeaderboardScore(){
const totalAnswered=Object.values(G.S.sr||{}).reduce((a,s)=>a+(s.tot||0),0);
const totalCorrect=Object.values(G.S.sr||{}).reduce((a,s)=>a+(s.ok||0),0);
if(totalAnswered<LB_MIN_ANSWERED)return{skipped:'thin_data',answered:totalAnswered};
const est=calcEstScore();
if(est==null)return{skipped:'no_est',answered:totalAnswered};
const streak=G.S.streak||0;
const readiness=est;
let uid=localStorage.getItem('pnimit_uid');
if(!uid){uid='u'+Math.random().toString(36).slice(2,10);localStorage.setItem('pnimit_uid',uid);}
const payload={uid,answered:totalAnswered,correct:totalCorrect,streak,readiness,ts:new Date().toISOString()};
try{
  const res=await fetch(SUPA_URL+'/rest/v1/pnimit_leaderboard',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Prefer':'resolution=merge-duplicates'},
    body:JSON.stringify(payload)
  });
  if(!res.ok){console.warn('Leaderboard submit non-ok',res.status);return{submitted:false,status:res.status};}
  return{submitted:true};
}catch(e){console.warn('Leaderboard submit failed',e);return{submitted:false,error:String(e)};}
}
export async function fetchLeaderboard(){
try{
  const res=await fetch(SUPA_URL+'/rest/v1/pnimit_leaderboard?select=uid,answered,correct,streak,readiness,accuracy,ts&order=accuracy.desc.nullslast,answered.desc&limit=20',{
    headers:{'apikey':SUPA_ANON}
  });
  return await res.json();
}catch(e){console.warn('Leaderboard fetch failed',e);return[];}
}
let _leaderboardData=null;
export async function showLeaderboard(){
const box=document.getElementById('leaderboard-box');
if(!box)return;
await submitLeaderboardScore();
box.innerHTML='<div style="text-align:center;padding:8px;font-size:10px;color:#64748b">Loading...</div>';
const data=await fetchLeaderboard();
_leaderboardData=data;
const myUid=localStorage.getItem('pnimit_uid')||'';
let html='';
if(!data.length){html='<div style="font-size:10px;color:#94a3b8;text-align:center">No data yet</div>';}
else{
data.forEach((r,i)=>{
  const isMe=r.uid===myUid;
  const ans=Math.max(0,Number(r.answered)||0);
  const cor=Math.max(0,Number(r.correct)||0);
  const rd=Math.max(0,Math.min(100,Number(r.readiness)||0));
  const acc=ans>0?Math.round((cor/ans)*100):null;
  const accStr=acc==null?'—':(acc+'%');
  html+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;${isMe?'background:#eff6ff;border-radius:8px;padding:6px 8px;margin:-2px -8px':''}">
  <span style="font-size:12px;font-weight:800;color:${i<3?['#f59e0b','#94a3b8','#d97706'][i]:'#64748b'};min-width:20px">${i+1}</span>
  <div style="flex:1;font-size:10px;font-weight:${isMe?'700':'400'}">${isMe?'You \u2b50':'User '+sanitize(r.uid).slice(0,4)}</div>
  <span style="font-size:10px;color:#64748b">${sanitize(String(ans))} Qs</span>
  <span style="font-size:10px;font-weight:700;color:${acc!=null&&acc>=70?'#059669':acc!=null&&acc>=50?'#d97706':'#64748b'}" title="Accuracy">${accStr}</span>
  <span style="font-size:10px;color:#94a3b8" title="Readiness (est. exam score)">~${sanitize(String(rd))}</span>
  <span style="font-size:10px">🔥${sanitize(String(r.streak))}d</span>
  </div>`;
});
}
box.innerHTML=html;
}
// ===== FEATURE: FEEDBACK SYSTEM =====
export function renderFeedback(){
let h='<div class="sec-t">💡 Feedback & Feature Requests</div>';
h+='<div class="sec-s">Help improve Pnimit Mega for everyone. AI reviews every submission.</div>';
h+='<div class="card" style="padding:16px;margin-bottom:12px">';
h+='<div style="font-size:12px;font-weight:700;margin-bottom:8px">Submit Feedback</div>';
h+='<select id="fb-type" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;margin-bottom:8px;background:#f8fafc">';
h+='<option value="bug">🐛 Bug Report</option>';
h+='<option value="feature">✨ Feature Request</option>';
h+='<option value="content">📝 Content Fix (wrong answer/explanation)</option>';
h+='<option value="ux">🎨 UX/Design Improvement</option>';
h+='<option value="other">💬 Other</option>';
h+='</select>';
h+='<textarea id="fb-text" dir="auto" placeholder="Describe your feedback in detail..." style="width:100%;min-height:100px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>';
h+='<button data-action="submit-feedback" class="btn" style="width:100%;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">📤 Submit Feedback</button>';
h+='</div>';
let fb=[];try{fb=JSON.parse(localStorage.getItem('pnimit_fb_sent')||'[]');}catch(e){}
if(fb.length){
h+='<div class="card" style="padding:14px">';
h+='<div style="font-size:12px;font-weight:700;margin-bottom:8px">📋 Your Submissions ('+fb.length+')</div>';
fb.slice(-5).reverse().forEach(f=>{
  h+='<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:10px">';
  h+='<span style="font-weight:600">'+({bug:'🐛',feature:'✨',content:'📝',ux:'🎨',other:'💬'}[f.type]||'💬')+' '+f.type+'</span>';
  h+=' \u00b7 <span style="color:#64748b">'+new Date(f.ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'</span>';
  h+='<div style="color:#475569;margin-top:2px;line-height:1.5">'+sanitize(f.text).slice(0,120)+(f.text.length>120?'...':'')+'</div>';
  if(f.aiResponse){h+='<div style="color:#7c3aed;margin-top:4px;padding:6px 8px;background:#f5f3ff;border-radius:6px;font-size:9px;line-height:1.5">🤖 '+sanitize(f.aiResponse)+'</div>';}
  h+='</div>';
});
h+='</div>';
}
return h;
}
export async function submitFeedbackForm(){
const type=document.getElementById('fb-type')?.value||'other';
const text=document.getElementById('fb-text')?.value?.trim();
if(!text){toast('Please describe your feedback','info');return;}
const entry={type,text,ts:Date.now(),version:APP_VERSION,uid:localStorage.getItem('pnimit_uid')||'anon'};
let fb=[];try{fb=JSON.parse(localStorage.getItem('pnimit_fb_sent')||'[]');}catch(e){}
fb.push(entry);
localStorage.setItem('pnimit_fb_sent',JSON.stringify(fb));
try{
  await fetch(SUPA_URL+'/rest/v1/pnimit_feedback',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Prefer':'return=minimal'},
    body:JSON.stringify({message:text,type,app_version:APP_VERSION})
  });
}catch(e){console.warn('Feedback submit failed',e);}
try{
  const aiText=await callAI([{role:'user',content:'A user submitted this feedback for a medical study app. Briefly acknowledge it and assess feasibility in 1-2 sentences. Type: '+type+'. Feedback: '+text}],300);
  if(aiText){
    fb[fb.length-1].aiResponse=aiText.slice(0,300);
    localStorage.setItem('pnimit_fb_sent',JSON.stringify(fb));
  }
}catch(e){}
G.render();
}
// ===== END FEEDBACK =====
const _SB_KEY=SUPA_ANON;
export function _sbDeviceId(){let id=localStorage.getItem('pnimit_devid');if(!id){id='dev_'+Math.random().toString(36).slice(2,12);localStorage.setItem('pnimit_devid',id);}return id;}
export async function cloudBackup(){
  const btn=document.getElementById('cloud-backup-btn');
  if(btn){btn.disabled=true;btn.textContent='☁️ Saving...';}
  try{
    // Bundle ancillary localStorage (mock_hist, sessions) so cross-device restore
    // carries the full picture, not just G.S.
    let mockHist=[],sessions=[];
    try{mockHist=JSON.parse(localStorage.getItem('pnimit_mock_hist')||'[]');}catch(e){}
    try{sessions=JSON.parse(localStorage.getItem('pnimit_sessions')||'[]');}catch(e){}
    const payload={id:_sbDeviceId(),data:{...G.S,_mockHist:mockHist,_sessions:sessions},updated_at:new Date().toISOString()};
    const res=await fetch(SUPA_URL+'/rest/v1/pnimit_backups',{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify(payload)
    });
    if(res.ok||res.status===409){
      // If 409, try upsert
      if(res.status===409){
        const patchRes=await fetch(SUPA_URL+'/rest/v1/pnimit_backups?id=eq.'+_sbDeviceId(),{
          method:'PATCH',
          headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({data:{...G.S,_mockHist:mockHist,_sessions:sessions},updated_at:new Date().toISOString()})
        });
        if(!patchRes.ok){const pe=await patchRes.text();toast('❌ Backup update failed: '+patchRes.status+'\n'+pe.slice(0,200),'info');return;}
      }
      toast('✅ Progress backed up to cloud!\nDevice ID: '+_sbDeviceId().slice(0,12)+'...','info');
    } else {
      const err=await res.text();
      toast('❌ Backup failed: '+res.status+'\n'+err.slice(0,200),'info');
    }
  }catch(e){toast('❌ Backup failed: '+e.message,'info');}
  if(btn){btn.disabled=false;btn.textContent='☁️ Backup to Cloud';}
}
// Filter a restore payload to only the keys that already exist in the
// current state object. Blocks:
//   - Unknown keys from a compromised or stale backup.
//   - Inherited / prototype keys (uses Object.hasOwn).
//   - Prototype pollution via __proto__ / constructor / prototype.
//   - Non-plain-object payloads (null, arrays, primitives).
// Analysis doc §3.7 — "cloudRestore whitelist assumption".
// Invariants locked by tests/cloudRestore.test.js.
const PROTO_BLOCKLIST = new Set(['__proto__', 'constructor', 'prototype']);
export function filterRestorePayload(payload, allowedKeys) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const allowed = allowedKeys instanceof Set ? allowedKeys : new Set(allowedKeys || []);
  const out = {};
  for (const k of Object.keys(payload)) {
    if (PROTO_BLOCKLIST.has(k)) continue;
    if (!allowed.has(k)) continue;
    if (!Object.prototype.hasOwnProperty.call(payload, k)) continue;
    out[k] = payload[k];
  }
  return out;
}

export async function cloudRestore(){
  const id=prompt('Enter device ID to restore from (leave blank for this device):',_sbDeviceId())||_sbDeviceId();
  if(!id)return;
  try{
    const res=await fetch(SUPA_URL+'/rest/v1/pnimit_backups?id=eq.'+encodeURIComponent(id)+'&select=data,updated_at',{
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY}
    });
    if(!res.ok){toast('❌ Restore failed: '+res.status,'info');return;}
    const rows=await res.json();
    if(!rows||!rows.length){toast('No backup found for ID: '+id,'info');return;}
    const row=rows[0];
    const msg='Restore backup from '+new Date(row.updated_at).toLocaleString()+'?\nThis will overwrite your current progress.';
    const ok=await new Promise(res=>{
      const h=`<div id="rstModal" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10001;padding:16px"><div style="background:#fff;border-radius:14px;max-width:360px;margin:20vh auto;padding:20px;font-family:Heebo,Inter,sans-serif;text-align:center"><div style="font-size:32px;margin-bottom:6px">☁️</div><div style="font-size:13px;line-height:1.6;margin-bottom:16px;white-space:pre-wrap">${sanitize(msg)}</div><div style="display:flex;gap:8px"><button id="rstYes" style="flex:1;padding:10px;background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">Restore</button><button id="rstNo" style="flex:1;padding:10px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-weight:700;cursor:pointer">Cancel</button></div></div></div>`;
      const d=document.createElement('div');d.innerHTML=h;document.body.appendChild(d.firstChild);
      const close=(v)=>{const m=document.getElementById('rstModal');if(m)m.remove();res(v);};
      document.getElementById('rstYes').addEventListener('click',()=>close(true));
      document.getElementById('rstNo').addEventListener('click',()=>close(false));
    });
    if(ok){
      // Pull sibling localStorage bundles out of the payload before G.S whitelist
      try{if(Array.isArray(row.data&&row.data._mockHist))localStorage.setItem('pnimit_mock_hist',JSON.stringify(row.data._mockHist.slice(-20)));}catch(e){}
      try{if(Array.isArray(row.data&&row.data._sessions))localStorage.setItem('pnimit_sessions',JSON.stringify(row.data._sessions.slice(-30)));}catch(e){}
      const validated=filterRestorePayload(row.data,new Set(Object.keys(G.S)));
      Object.assign(G.S,validated);G.save();G.render();
      toast('✅ Progress restored!','success');
    }
  }catch(e){toast('❌ Restore failed: '+e.message,'info');}
}

export function getDiagnostics(){
const tot=G.S.qOk+G.S.qNo;
const srEntries=Object.entries(G.S.sr||{});
const srDue=srEntries.filter(([k,v])=>v.next<=Date.now()).length;
const srHard=srEntries.filter(([k,v])=>v.ef<2.0).length;
const srMastered=srEntries.filter(([k,v])=>v.n>=3&&v.ef>=2.5).length;
const ts=getTopicStats();
const weakTopics=TOPICS.map((t,i)=>({t,s:ts[i]||{ok:0,no:0,tot:0}}))
  .filter(p=>p.s.tot>=3).sort((a,b)=>(a.s.ok/a.s.tot)-(b.s.ok/b.s.tot)).slice(0,5);
const weakStr=weakTopics.map(p=>`  ${p.t}: ${Math.round(p.s.ok/p.s.tot*100)}% (${p.s.ok}/${p.s.tot})`).join('\n');
return `Pnimit Mega v${APP_VERSION}\n`+
`Date: ${new Date().toISOString()}\n`+
`UA: ${navigator.userAgent}\n`+
`Screen: ${screen.width}x${screen.height} · DPR: ${devicePixelRatio}\n`+
`---\n`+
`Questions: ${G.QZ.length} · Answered: ${tot} · Correct: ${G.S.qOk} (${tot?Math.round(G.S.qOk/tot*100):0}%)\n`+
`SR: ${srEntries.length} tracked · ${srDue} due · ${srHard} hard (EF<2.0) · ${srMastered} mastered\n`+
`Topics done: ${Object.values(G.S.ck).filter(Boolean).length}/${TOPICS.length}\n`+
`Bookmarks: ${Object.values(G.S.bk).filter(Boolean).length}\n`+
`Streak: ${G.S.streak||0} days\n`+
`---\n`+
`Weakest 5 topics:\n${weakStr||'  (not enough data)'}\n`+
`---\n`+
`Storage: ${(JSON.stringify(G.S).length/1024).toFixed(1)}KB · Online: ${navigator.onLine}\n`+
`Dark: ${G.S.dark?'on':'off'} · SW: ${navigator.serviceWorker?'registered':'none'}`;
}
// copyDiagnostics removed — dead code
export async function submitReport(){
const type=G.S._reportType;
if(!type)return;
const input=document.getElementById('reportInput');
const msg=input?.value?.trim();
if(!msg){const st=document.getElementById('fbStatus');if(st){st.textContent='⚠️ כתוב משהו';st.style.display='block';st.style.color='#d97706';setTimeout(()=>st.style.display='none',2000);}return;}
const labels={bug:'🐛 Bug',wrong_answer:'❌ Wrong Answer',feature:'💡 Feature'};
let qObj=null,context='';
if(G.pool.length&&G.qi<G.pool.length){qObj=G.QZ[G.pool[G.qi]];}
if(type==='wrong_answer'&&qObj){
// Stable content hash survives dedup/reindex. 8-char hash of normalized stem.
const _hashStem=qObj.q.replace(/[\s\d.,?!:;()\[\]"'\-\u05BE]+/g,'').toLowerCase().slice(0,200);
let _h=0;for(let i=0;i<_hashStem.length;i++){_h=((_h<<5)-_h+_hashStem.charCodeAt(i))|0;}
const _qhash=(_h>>>0).toString(16).padStart(8,'0');
context=`Q#${G.pool[G.qi]} [hash:${_qhash}]: ${qObj.q.substring(0,100)} | correct: ${qObj.o[qObj.c]}`;
}
const st=document.getElementById('fbStatus');
if(st){st.textContent='⏳ שולח...';st.style.display='block';st.style.color='#64748b';}
const diag=getDiagnostics();
const payload={type,msg,context,diag,ts:new Date().toISOString(),v:APP_VERSION};
let fb;try{fb=JSON.parse(localStorage.getItem('pnimit_feedback')||'[]');}catch(e){fb=[];}
fb.push(payload);if(fb.length>50)fb.splice(0,fb.length-50);
localStorage.setItem('pnimit_feedback',JSON.stringify(fb));
fetch(SUPA_URL+'/rest/v1/pnimit_feedback',{
method:'POST',headers:{'Content-Type':'application/json','apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Prefer':'return=minimal'},
body:JSON.stringify({message:msg,diagnostics:diag,app_version:APP_VERSION,type,context})
}).catch(()=>{});
if(type==='wrong_answer'&&qObj){
if(st){st.textContent='🤖 AI verifying...';st.style.color='#8b5cf6';}
try{
const aiText=await callAI([{role:'user',content:`Internal medicine board exam. A student reports wrong answer key.\nQUESTION: ${qObj.q}\nOPTIONS: ${qObj.o.map((o,i)=>(i===qObj.c?'[MARKED CORRECT] ':'')+o).join(' | ')}\nSTUDENT SAYS: ${msg}\nIs the answer key correct or wrong? 2-3 sentences. Start with VERDICT: CORRECT or VERDICT: WRONG.`}],400);
const isWrong=aiText.startsWith('VERDICT: WRONG');
const aiBox=document.getElementById('aiVerifyResult');
if(aiBox){
aiBox.innerHTML=`<div style="font-weight:700;margin-bottom:4px;color:${isWrong?'#dc2626':'#059669'}">${isWrong?'⚠️ AI agrees — answer key may be wrong':'✅ AI: answer key is correct'}</div><div>${sanitize(aiText.replace(/VERDICT: (CORRECT|WRONG)/,'').trim())}</div>`;
aiBox.style.display='block';aiBox.style.background=isWrong?'#fef2f2':'#f0fdf4';aiBox.style.border=`1px solid ${isWrong?'#fecaca':'#bbf7d0'}`;
}
if(st){st.textContent=isWrong?'⚠️ AI confirmed error':'✅ AI: answer key OK';st.style.color=isWrong?'#dc2626':'#059669';}
saveAnswerReport(G.pool[G.qi],msg,aiText);
}catch(e){if(st){st.textContent='✅ Saved';st.style.color='#059669';}}
}else{
if(st){st.textContent='✅ '+labels[type]+' saved';st.style.color='#059669';}
}
if(input)input.value='';
G.S._reportType=null;
if(st)setTimeout(()=>{st.style.display='none';G.render();},type==='wrong_answer'?8000:3000);
}

// ===== WRONG ANSWER REPORTS → SUPABASE =====
export async function saveAnswerReport(qIdx, userReason, aiVerdict){
try{
const q=G.QZ[qIdx];
await fetch(SUPA_URL+'/rest/v1/answer_reports',{
method:'POST',
headers:{'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Content-Type':'application/json','Prefer':'return=minimal'},
body:JSON.stringify({app:'pnimit',question_idx:qIdx,question_text:(q.q||'').slice(0,200),current_answer:q.c,reported_answer:(userReason||'').slice(0,50),user_reason:userReason||'',ai_verdict:aiVerdict||'',device_id:_sbDeviceId()})
});
}catch(e){console.warn('Report G.save failed:',e.message);}
}

