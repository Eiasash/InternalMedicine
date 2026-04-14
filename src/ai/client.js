import G from '../core/globals.js';
import { AI_PROXY, AI_SECRET } from '../core/constants.js';
import { getApiKey } from '../core/utils.js';

// AI client — extracted from pnimit-mega.html
// Depends on: AI_PROXY, AI_SECRET (constants.js), getApiKey (utils.js)

export async function callAI(messages,maxTokens=400,model='sonnet'){
  // Cancel any in-flight AI request before starting new one
  if(G._aiAbortController)G._aiAbortController.abort();
  G._aiAbortController=new AbortController();
  const signal=G._aiAbortController.signal;
// Model alias map for direct API fallback
const modelMap={sonnet:'claude-sonnet-4-6',opus:'claude-opus-4-6',haiku:'claude-haiku-4-5-20251001'};
try{
const pr=await fetch(AI_PROXY,{
method:'POST',
headers:{'Content-Type':'application/json','x-api-secret':AI_SECRET},
body:JSON.stringify({model,max_tokens:maxTokens,messages}),
signal
});
if(pr.ok){const d=await pr.json();return d.content?.[0]?.text||'';}
console.warn('Proxy status:',pr.status);
}catch(e){console.warn('Proxy:',e.message);}
// Fallback to personal API key with correct model name
const apiKey=getApiKey();
if(!apiKey)throw new Error('no_key');
const fullModel=modelMap[model]||model;
const r=await fetch('https://api.anthropic.com/v1/messages',{
method:'POST',
headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
body:JSON.stringify({model:fullModel,max_tokens:maxTokens,messages}),
signal
});
if(!r.ok)throw new Error('API '+r.status);
const d=await r.json();
return d.content?.[0]?.text||'';
}
