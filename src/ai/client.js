import { AI_PROXY } from '../core/constants.js';
import { getProxyBearer } from '../services/supabaseAuth.js';
import { getApiKey, setApiKey, markBadApiKey, clearBadApiKeyMarker } from '../core/utils.js';

// AI client — extracted from pnimit-mega.html
// Depends on: AI_PROXY (constants.js), getApiKey/setApiKey (utils.js), getProxyBearer (supabaseAuth.js)

// Translate a fetch Response status into a user-friendly message.
// Keeps the short "API NNN" format callers already surface, but prepends a
// specific Hebrew-friendly hint so the user sees WHY the call failed instead
// of a bare code. Sibling of Geriatrics' _aiErrFromStatus (shlav-a-mega.html).
export function aiErrFromStatus(status){
  if(status===401)return'API 401 — מפתח API לא תקין';
  // 403 from direct Anthropic is permission_error (valid key, no access to the
  // model/resource) — NOT a bad key. Surface it distinctly so the user fixes
  // access/billing instead of re-entering a key that is fine.
  if(status===403)return'API 403 — אין הרשאה למשאב/מודל זה';
  if(status===429)return'API 429 — חריגה ממכסה, נסה שוב בעוד רגע';
  if(status>=500&&status<600)return'API '+status+' — שירות לא זמין כרגע';
  return'API '+status;
}

export async function callAI(messages,maxTokens=400,model='sonnet',ground=null){
  // v9.84.1: per-call AbortController (was singleton G._aiAbortController which
  // cancelled in-flight peers on every new invocation, breaking bulk callers).
  const _ctrl=new AbortController();
  const signal=_ctrl.signal;
  const _timeoutId=setTimeout(()=>_ctrl.abort(),30000);
// Model alias map for direct API fallback
const modelMap={sonnet:'claude-sonnet-4-6',opus:'claude-opus-4-6',haiku:'claude-haiku-4-5-20251001'};
try{
try{
// P0 cutover (runbook §3): authenticate the proxy with a Supabase session JWT
// (existing GoTrue/OAuth session, else an anonymous one) instead of the shared
// x-api-secret that used to ship in the bundle.
const _authz=await getProxyBearer();
const pr=await fetch(AI_PROXY,{
method:'POST',
headers:{'Content-Type':'application/json','Authorization':_authz},
body:JSON.stringify(ground?{model,max_tokens:maxTokens,messages,ground}:{model,max_tokens:maxTokens,messages}),
signal
});
if(pr.ok){const d=await pr.json();return d.content?.[0]?.text||'';}
console.warn('Proxy status:',pr.status);
}catch(e){if(e&&e.name==='AbortError')throw e;console.warn('Proxy:',e.message);}
// Fallback to personal API key with correct model name
const apiKey=getApiKey();
if(!apiKey)throw new Error('no_key');
const fullModel=modelMap[model]||model;
let r;
try{
r=await fetch('https://api.anthropic.com/v1/messages',{
method:'POST',
headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
body:JSON.stringify({model:fullModel,max_tokens:maxTokens,messages}),
signal
});
}catch(e){
if(e&&e.name==='AbortError')throw e;
throw new Error('Network error — check your connection');
}
if(!r.ok){
// 401 on the DIRECT call means the user's stored key is genuinely bad (auth
// failure) — clear it so the next attempt re-prompts instead of silently
// looping on a dead key, and mark it so the account-restore path (auth.js)
// won't write the same dead key back. 403 is permission_error (a VALID key
// lacking model/resource access), so we must NOT clear it — that would turn a
// permission/billing problem into a re-enter-key loop. (The proxy path above
// uses the shared x-api-secret, so its 401/403 is NOT the user's key and is
// intentionally untouched.) Mirrors more-view.js chat handler / Geriatrics callAI.
if(r.status===401){markBadApiKey(apiKey);setApiKey('');}
throw new Error(aiErrFromStatus(r.status));
}
const d=await r.json();
// A successful call proves the key is good — drop any stale bad-key marker.
clearBadApiKeyMarker();
return d.content?.[0]?.text||'';
}finally{clearTimeout(_timeoutId);}
}
