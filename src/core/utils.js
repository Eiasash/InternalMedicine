import G from './globals.js';
// Utility functions — extracted from pnimit-mega.html

// Safe localStorage JSON parser
export function safeJSONParse(key,fallback){try{const r=localStorage.getItem(key);if(!r)return fallback;const p=JSON.parse(r);return p??fallback;}catch(e){try{localStorage.removeItem(key);}catch(_){}return fallback;}}

// XSS-safe string escaping
export function sanitize(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

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
  const inv={};shuf.forEach((orig,disp)=>{inv[orig]=disp;});
  const letters=['A','B','C','D','E'];
  const heb=['א','ב','ג','ד','ה'];
  return text.replace(/\b([A-E])\b/g,(m,letter)=>{
    const origIdx=letters.indexOf(letter);
    if(origIdx===-1||inv[origIdx]===undefined)return m;
    return letters[inv[origIdx]];
  }).replace(/(תשובה\s*)([א-ה])\b/g,(m,prefix,letter)=>{
    const origIdx=heb.indexOf(letter);
    if(origIdx===-1||inv[origIdx]===undefined)return m;
    return prefix+heb[inv[origIdx]];
  });
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
