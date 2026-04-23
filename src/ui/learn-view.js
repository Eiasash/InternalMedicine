import G from '../core/globals.js';
import { TOPICS } from '../core/constants.js';
import { sanitize } from '../core/utils.js';
import { fsrsR, fsrsInterval, fsrsInitNew, fsrsUpdate } from '../sr/fsrs-bridge.js';

export function toggleNote(i){G.openNote=G.openNote===i?null:i;G.render();}
export function renderStudy(){
let h=`<div class="sec-t">📚 Study Notes</div><div class="sec-s">Internal Medicine Board Prep · Harrison's 22e + Required Articles</div>`;
h+=`<input class="search-box" placeholder="Search topics..." data-action="filter-notes" id="nfilt">`;
const fv=document.getElementById('nfilt')?.value?.toLowerCase()||'';
G.NOTES.filter(n=>n.topic.toLowerCase().includes(fv)||n.notes.toLowerCase().includes(fv)).forEach(n=>{
const i=n.id;
h+=`<div class="card"><button class="acc-h" data-action="toggle-note" data-id="${i}">
<div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;font-size:12px">${n.topic}</span>
<span style="font-size:9px;color:#94a3b8">${n.ch}</span></div>
<span class="acc-ar${G.openNote===i?' op':''}">▼</span></button>`;
if(G.openNote===i){
const _fmtNote=function(txt){
const parts=txt.split(/📖\s*HARRISON BOARD PEARLS:\s*/i);
const clinicalNotes=parts[0]||'';
const boardPearls=parts[1]||'';
function fmtLine(line){
// Section headers: ▸ HEADING — G.render as a styled block header
if(/^▸\s+/.test(line)){
const title=line.replace(/^▸\s+/,'');
return '<div style="margin:14px 0 6px;padding:5px 10px;background:linear-gradient(90deg,#eff6ff,transparent);border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:.6px">'+title+'</div>';
}
// Sub-headers: ALL-CAPS word followed by colon at line start (e.g. "Tai Chi:", "RACF setting:")
line=line.replace(/^([A-Z][A-Z\s/&\-()]{2,40}):/,'<strong style="color:#0f172a">$1:</strong>');
// Any remaining "Label:" pattern
line=line.replace(/^([^:\n]{2,50}):/,'<strong>$1:</strong>');
// Numbers with units, thresholds
line=line.replace(/(≥\d[\d.]*\s*(?:mmHg|m\/s|s\b|mg|IU|%)?|≤\d[\d.]*\s*(?:mmHg|m\/s|s\b|mg|IU|%)?|[<>]\d[\d.]*\s*(?:mmHg|m\/s|s\b|mg|IU|%)?|\d+–\d+%|\d+%)/g,'<b style="color:#0f172a">$1</b>');
// SOE badges
line=line.replace(/\(SOE=[A-C]\)/g,'<span style="background:#ecfdf5;color:#059669;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;vertical-align:middle">$&</span>');
// INCREASES / AVOID / WARNING keywords
line=line.replace(/\b(INCREASES|AVOID|DO NOT|WARNING|CRITICAL|CONTRAINDICATED)\b/g,'<span style="color:#dc2626;font-weight:700">$1</span>');
// Positive keywords
line=line.replace(/\b(SOE=A)\b/g,'<span style="color:#059669;font-weight:700">$1</span>');
return line;
}
function fmtBlock(t){
const paras=t.split(/\n{2,}/);
return paras.map(function(para){
const lines=para.split('\n');
// Check if first line is a section header
if(lines.length===1&&/^▸\s+/.test(lines[0])){
return fmtLine(lines[0]);
}
const fmt=lines.map(fmtLine).join('<br>');
return '<p style="font-size:11.5px;line-height:1.9;margin:0 0 10px;color:#1e293b">'+fmt+'</p>';
}).join('');
}
let h='<div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📝 Clinical Notes</div>';
h+=fmtBlock(clinicalNotes.trim());
if(boardPearls.trim()){
h+='<div style="margin-top:16px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">';
h+='<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📖 Board Pearls</div>';
h+='<p style="font-size:11px;line-height:1.85;margin:0;color:#14532d">'+boardPearls.trim().replace(/(≥\d[\d.]*|≤\d[\d.]*|[<>]\d[\d.]*|\d+%)/g,'<b>$1</b>').replace(/\(SOE=[A-C]\)/g,'<span style="background:#dcfce7;color:#166534;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700">$&</span>').replace(/\b(INCREASES|AVOID|DO NOT)\b/g,'<span style="color:#dc2626;font-weight:700">$1</span>')+'</p>';
h+='</div>';
}
return h;
};
h+=`<div style="padding:10px 14px 14px;border-top:1px solid #f1f5f9">${_fmtNote(n.notes)}</div>`;
}
h+=`</div>`;
});
return h;
}
export function filterNotes(v){G.render();}


// Flashcards + Drug lookup renderers

// ===== Flashcards FSRS helpers =====
// Returns array of card indices that are either due (next <= now) or unseen.
export function fcGetDueIndices(){
  const now=Date.now();
  const fcsr=G.S.fcsr||{};
  const due=[];
  for(let i=0;i<G.FLASH.length;i++){
    const r=fcsr['fc_'+i];
    if(!r||!r.next||r.next<=now)due.push(i);
  }
  return due;
}

// Rebuild the due-queue and shuffle (called when entering Due mode or after queue exhausted)
export function fcRebuildQueue(){
  const due=fcGetDueIndices();
  for(let i=due.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[due[i],due[j]]=[due[j],due[i]];}
  G.S.fcQueue=due;
  G.S.fcQueuePos=0;
}

// Score a flashcard via FSRS-4.5 (rating 1=Again, 2=Hard, 3=Good, 4=Easy).
// Maintains legacy `n` counter for the UI status chips.
export function fcFsrsScore(key,rating){
  if(!G.S.fcsr)G.S.fcsr={};
  if(!G.S.fcsr[key])G.S.fcsr[key]={n:0,next:0};
  const s=G.S.fcsr[key];
  const daysSinceReview=s.lastReview?Math.max(0,(Date.now()-s.lastReview)/86400000):0;
  if(s.fsrsS===undefined||s.fsrsD===undefined){
    const init=fsrsInitNew(rating);s.fsrsS=init.s;s.fsrsD=init.d;
  }
  const rPrev=daysSinceReview>0?fsrsR(daysSinceReview,s.fsrsS):1;
  const upd=fsrsUpdate(s.fsrsS,s.fsrsD,rPrev,rating);
  s.fsrsS=Math.round(upd.s*1000)/1000;
  s.fsrsD=Math.round(upd.d*100)/100;
  s.lastReview=Date.now();
  const days=fsrsIntervalWithDeadline(s.fsrsS,s.fsrsD,rPrev);
  s.next=Date.now()+days*86400000;
  // Legacy n counter: 0 on Again, cap at 2 for "known" chip.
  s.n=rating===1?0:Math.min(2,(s.n||0)+1);
  s.days=days;
}

export function renderFlash(){
const dueMode=!!G.S.fcDueMode;
// Build & cache due-queue when entering Due mode or running past queue end.
if(dueMode){
  if(!Array.isArray(G.S.fcQueue)||G.S.fcQueue.length===0||G.S.fcQueuePos>=G.S.fcQueue.length){
    fcRebuildQueue();
  }
}
const queueEmpty=dueMode&&(!G.S.fcQueue||G.S.fcQueue.length===0);
const activeIdx=dueMode?(G.S.fcQueue[G.S.fcQueuePos]??0):(G.S.fci%G.FLASH.length);
const f=G.FLASH[activeIdx];
const fcsr=G.S.fcsr||{};
let fcKnown=0,fcLearning=0,fcNew=0,fcDue=0;
const now=Date.now();
for(let i=0;i<G.FLASH.length;i++){
  const r=fcsr['fc_'+i];
  if(!r){fcNew++;fcDue++;}
  else{
    if(r.n>=2)fcKnown++;else fcLearning++;
    if(!r.next||r.next<=now)fcDue++;
  }
}
let h=`<div class="sec-t">🃏 Flashcards</div><div class="sec-s">${G.FLASH.length} high-yield cards · FSRS-4.5 scheduling</div>`;
// Mode toggle
h+=`<div style="display:flex;gap:6px;margin-bottom:10px">
<button class="btn ${dueMode?'btn-p':'btn-o'}" data-action="fc-mode" data-mode="due" aria-pressed="${dueMode}">🎯 Due (${fcDue})</button>
<button class="btn ${dueMode?'btn-o':'btn-p'}" data-action="fc-mode" data-mode="browse" aria-pressed="${!dueMode}">📚 Browse all</button>
</div>`;
h+=`<div style="display:flex;gap:6px;margin-bottom:12px">
<span class="badge badge-g">✅ Known: ${fcKnown}</span>
<span class="badge badge-y">📖 Learning: ${fcLearning}</span>
<span class="badge" style="background:#f1f5f9;color:#64748b">🆕 New: ${fcNew}</span>
</div>`;
if(queueEmpty){
  h+=`<div class="card" style="text-align:center;padding:28px 16px"><div style="font-size:32px;margin-bottom:8px">🎉</div>
<div style="font-weight:700;font-size:13px;margin-bottom:6px">All caught up!</div>
<div style="font-size:11px;color:#64748b;margin-bottom:12px">No flashcards due right now. Switch to Browse to review anyway.</div>
<button class="btn btn-p" data-action="fc-mode" data-mode="browse">📚 Browse all</button></div>`;
  return h;
}
// Card
const _f=sanitize(G.S.fcFlip?f.b:f.f);
h+=`<div class="fc" data-action="fc-flip" style="border-color:${G.S.fcFlip?'rgb(var(--em))':'rgb(var(--sky))'}" role="button" tabindex="0" aria-label="${G.S.fcFlip?'Show question':'Show answer'}">
<p style="font-size:${G.S.fcFlip?'12px':'14px'};font-weight:${G.S.fcFlip?'400':'700'};line-height:1.7;color:${G.S.fcFlip?'#334155':'#1e293b'}">${_f}</p>
<p style="font-size:9px;color:#94a3b8;margin-top:12px">${G.S.fcFlip?'Tap for question':'Tap to reveal answer'} · ${dueMode?(G.S.fcQueuePos+1)+'/'+G.S.fcQueue.length:(activeIdx+1)+'/'+G.FLASH.length}</p>
</div>`;
// FSRS rating row (only after flip)
if(G.S.fcFlip){
  const _r=fcsr['fc_'+activeIdx];
  const _nextHint=(rating)=>{
    // Tiny preview of the next interval for each rating, for label UX
    const tmpS=_r?.fsrsS;
    if(!tmpS){const init=fsrsInitNew(rating);return fsrsIntervalWithDeadline(init.s,init.d,1);}
    const upd=fsrsUpdate(tmpS,_r.fsrsD,1,rating);
    return fsrsIntervalWithDeadline(upd.s,upd.d,1);
  };
  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px">
<button class="btn" style="background:#fef2f2;color:#dc2626;font-size:10px;padding:8px 4px" data-action="fc-rate" data-r="1" aria-label="Rate: Again">🔄 שוב<br><span style="font-size:8px;opacity:.7">10m</span></button>
<button class="btn" style="background:#fffbeb;color:#d97706;font-size:10px;padding:8px 4px" data-action="fc-rate" data-r="2" aria-label="Rate: Hard">🤔 קשה<br><span style="font-size:8px;opacity:.7">${_nextHint(2)}d</span></button>
<button class="btn" style="background:#ecfdf5;color:#059669;font-size:10px;padding:8px 4px" data-action="fc-rate" data-r="3" aria-label="Rate: Good">✅ טוב<br><span style="font-size:8px;opacity:.7">${_nextHint(3)}d</span></button>
<button class="btn" style="background:#f0f9ff;color:#0369a1;font-size:10px;padding:8px 4px" data-action="fc-rate" data-r="4" aria-label="Rate: Easy">🌟 קל<br><span style="font-size:8px;opacity:.7">${_nextHint(4)}d</span></button>
</div>`;
}else if(!dueMode){
  // Browse mode prev/next when card not yet flipped
  h+=`<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
<button class="btn btn-o" data-action="fc-prev" aria-label="Previous flashcard">← Prev</button>
<button class="btn btn-p" data-action="fc-next" aria-label="Next flashcard">Next →</button>
</div>`;
}
if(!dueMode){
  h+=`<div style="text-align:center;margin-top:8px"><button data-action="fc-random" style="font-size:10px;color:rgb(var(--sky));text-decoration:underline" aria-label="Random flashcard">🔀 Random</button></div>`;
}
return h;
}

// ===== DRUG LOOKUP =====
let drugSearch='';
export function renderDrugs(){
let h=`<div class="sec-t">💊 Drug Lookup</div><div class="sec-s">Beers Criteria + ACB Score Checker</div>`;
h+=`<input class="search-box" placeholder="Search drug name..." data-action="drug-search" value="${drugSearch}" id="dsrch">`;
const fv=drugSearch.toLowerCase();
const filtered=G.DRUGS.filter(d=>!fv||d.name.toLowerCase().includes(fv)||d.heb.includes(fv)||(d.cat||'').toLowerCase().includes(fv));
h+=`<div class="card">`;
if(!filtered.length)h+=`<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">No drugs found</div>`;
filtered.forEach(d=>{
h+=`<div class="drug-row"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
<span style="font-weight:700;font-size:12px">${d.name} ${d.heb?'<span style="color:#94a3b8">('+d.heb+')</span>':''}</span>
<div style="display:flex;gap:4px">
${d.beers?'<span class="badge badge-r">BEERS</span>':''}
${d.acb>=3?'<span class="badge badge-r">ACB '+d.acb+'</span>':d.acb>=2?'<span class="badge badge-y">ACB '+d.acb+'</span>':d.acb>=1?'<span class="badge badge-g">ACB '+d.acb+'</span>':''}
</div></div>
<div style="font-size:10px;color:#64748b">${d.cat||''}</div>
<div style="font-size:10px;color:#475569;margin-top:2px">${d.risk}</div></div>`;
});
h+=`</div>`;
return h;
}

function fcRate(rating) { // rating: 1=Again, 2=Hard, 3=Good, 4=Easy (FSRS)
  const dueMode = !!G.S.fcDueMode;
  const activeIdx = dueMode ? (G.S.fcQueue[G.S.fcQueuePos] ?? 0) : (G.S.fci % G.FLASH.length);
  const key = 'fc_' + activeIdx;
  fcFsrsScore(key, rating);
  if (dueMode) {
    // Advance within the due queue; on Again, re-append to end of queue for immediate relearn.
    if (rating === 1) {
      G.S.fcQueue.push(activeIdx);
    }
    G.S.fcQueuePos = (G.S.fcQueuePos || 0) + 1;
    if (G.S.fcQueuePos >= G.S.fcQueue.length) {
      // Try to rebuild — maybe more cards became due, or queue is empty
      fcRebuildQueue();
    }
  } else {
    G.S.fci++;
  }
  G.S.fcFlip = false;
  G.save();
  G.render();
}

// Event delegation for Learn tab — set up once on #ct container
export function initLearnEvents(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'toggle-note') {
      toggleNote(parseInt(el.dataset.id, 10));
    }
    else if (action === 'fc-flip') {
      G.S.fcFlip = !G.S.fcFlip; G.save(); G.render();
    }
    else if (action === 'fc-prev') {
      G.S.fci = (G.S.fci - 1 + G.FLASH.length) % G.FLASH.length;
      G.S.fcFlip = false; G.save(); G.render();
    }
    else if (action === 'fc-next') {
      G.S.fci++; G.S.fcFlip = false; G.save(); G.render();
    }
    else if (action === 'fc-rate') {
      fcRate(parseInt(el.dataset.r, 10));
    }
    else if (action === 'fc-random') {
      G.S.fci = Math.floor(Math.random() * G.FLASH.length);
      G.S.fcFlip = false; G.save(); G.render();
    }
    else if (action === 'fc-mode') {
      const mode = el.dataset.mode;
      G.S.fcDueMode = (mode === 'due');
      G.S.fcFlip = false;
      if (G.S.fcDueMode) fcRebuildQueue();
      G.save(); G.render();
    }
  });
  container.addEventListener('input', (e) => {
    if (e.target.dataset.action === 'filter-notes') {
      G.render();
    }
    else if (e.target.dataset.action === 'drug-search') {
      drugSearch = e.target.value; // module-scoped variable (fixes window leak bug)
      G.render();
    }
  });
}
