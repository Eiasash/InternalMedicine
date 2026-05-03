import G from './globals.js';
// Utility functions — extracted from pnimit-mega.html

// Safe localStorage JSON parser
export function safeJSONParse(key,fallback){try{const r=localStorage.getItem(key);if(!r)return fallback;const p=JSON.parse(r);return p??fallback;}catch(e){try{localStorage.removeItem(key);}catch(_){}return fallback;}}


export function toast(msg,type='info',ms=3500){
  try{
    const colors={info:'#0ea5e9',success:'#059669',error:'#dc2626',warn:'#d97706'};
    const bg=colors[type]||colors.info;
    const d=document.createElement('div');
    d.setAttribute('role','status');
    d.setAttribute('aria-live','polite');
    d.style.cssText=`position:fixed;left:50%;transform:translateX(-50%);bottom:calc(70px + env(safe-area-inset-bottom));background:${bg};color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:600;font-family:Heebo,Inter,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:10000;max-width:90vw;text-align:center;direction:auto;white-space:pre-wrap;line-height:1.5`;
    d.textContent=msg;
    document.body.appendChild(d);
    setTimeout(()=>{d.style.transition='opacity .3s';d.style.opacity='0';setTimeout(()=>d.remove(),300);},ms);
  }catch(e){console.warn('toast failed:',e,msg);}
}

// Grading helper — honors q.c_accept (array of accepted answer indices) if present,
// falls back to primary q.c. q.c stays the primary/display answer; c_accept is additive.
export function isOk(q,i){if(!q)return false;if(Array.isArray(q.c_accept)&&q.c_accept.length)return q.c_accept.includes(i);return i===q.c;}

// XSS-safe string escaping
export function sanitize(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
export function heDir(s){s=String(s||'');if(!s)return'auto';let he=0,en=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>=0x0590&&c<=0x05FF)he++;else if((c>=0x41&&c<=0x5A)||(c>=0x61&&c<=0x7A))en++;}const t=he+en;if(!t)return'auto';return he/t>=0.25?'rtl':'ltr';}

// API key management
export function getApiKey(){return localStorage.getItem('pnimit_apikey')||'';}
export function setApiKey(k){if(k)localStorage.setItem('pnimit_apikey',k.trim());else localStorage.removeItem('pnimit_apikey');}

// Format seconds as H:MM:SS or MM:SS
export function fmtT(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return(h?h+':':'')+String(m).padStart(2,'0')+':'+String(sc).padStart(2,'0')}

// Option shuffle utilities
export function isMetaOption(text){
  // Detect options that reference letter positions or aggregate all answers
  // These must NOT be shuffled as their content references other option positions
  const t=(text||'').trim();
  const metaPatterns=[
    /כל\s*(ה)?תשוב/,           // כל התשובות נכונות
    /כל\s*(ה)?אמור/,            // כל האמור נכון
    /אף\s*תשוב/,                // אף תשובה
    /all\s+of\s+the\s+above/i,
    /none\s+of\s+the\s+above/i,
    /both\s+[a-e]\s+and\s+[a-e]/i,
    /[א-ת][׳']\s*ו[־-]?\s*[א-ת][׳']/,  // א׳ ו-ב׳, א׳ וג׳
    /^\s*[a-e]\s+and\s+[a-e]\s*$/i,      // "A and C"
    /\d\s*ו\s*\d/,              // 1 ו-2
  ];
  return metaPatterns.some(p=>p.test(t));
}
export function remapExplanationLetters(text,shuf){
  // shuf[displayPos]=origIdx → build inverse: origIdx→displayPos
  const inv={};shuf.forEach((orig,disp)=>{inv[orig]=disp;});
  const latin=['A','B','C','D','E'];
  const heb=['א','ב','ג','ד','ה'];
  const remap=(orig,arr)=>{
    const i=arr.indexOf(orig);
    if(i===-1||inv[i]===undefined)return orig;
    return arr[inv[i]];
  };
  // (1) Latin "B"/"Answer C"
  // (2) Hebrew "תשובה ב'" form
  // (3) Hebrew bare label "א'/ב' שגויה" — letter+geresh used as bullet label.
  //     Lookbehind (?<![א-ת]) excludes mid-word gershayim like "מג'ורי" (Major).
  //     Lookahead requires geresh + whitespace/punct/EOL so foreign-sound markers
  //     like "ג'נטיקה" (genetics) are also rejected.
  // Single regex with alternation prevents double-remap.
  // v10.4.9 — was missing form (3); ported from Geri v10.64.22.
  return text
    .replace(/\b([A-E])\b/g,(m,l)=>remap(l,latin))
    .replace(
      /(?:(תשובה\s*)([א-ה])(?=['׳’]|[\s.,;:!?)]|$)|(?<![א-ת])([א-ה])(['׳’])(?=[\s.,;:!?)]|$))/g,
      (m,p,l1,l2,ger)=>p?p+remap(l1,heb):remap(l2,heb)+ger
    );
}
export function getOptShuffle(qIdx,q){
  // Return stable shuffle for this question in this session
  if(G._optShuffle&&G._optShuffle.qIdx===qIdx)return G._optShuffle.map;
  const n=q.o.length;
  // Separate meta-options (pin to end) from regular options (shuffle)
  const regular=[],meta=[];
  q.o.forEach((_,i)=>{isMetaOption(q.o[i])?meta.push(i):regular.push(i);});
  // Fisher-Yates shuffle of regular options only, seeded by qIdx
  let seed=qIdx*31+17;
  const rand=()=>{seed=(seed*1664525+1013904223)&0xffffffff;return(seed>>>0)/0xffffffff;};
  for(let i=regular.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [regular[i],regular[j]]=[regular[j],regular[i]];
  }
  // Meta options stay at end in original relative order
  const map=[...regular,...meta];
  G._optShuffle={qIdx,map};
  return map;
}
