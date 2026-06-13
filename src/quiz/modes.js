import G from '../core/globals.js';
import { toast } from '../core/utils.js';

// Quiz peripherals kept after the mode cleanup: wake lock, speech, the
// next-best-step filter, and voice-to-search.

export async function requestWakeLock(){
  try{
    if('wakeLock' in navigator){
      G.wakeLock=await navigator.wakeLock.request('screen');
      G.wakeLock.addEventListener('release',()=>{G.wakeLock=null;});
    }
  }catch(e){/* user denied or unsupported */}
}

export function speakQuestion(){
  if(!window.speechSynthesis)return;
  if(G.isSpeaking){window.speechSynthesis.cancel();G.isSpeaking=false;G.render();return;}
  const q=G.QZ[G.pool[G.qi]];if(!q)return;
  let text=q.q+(q.img?' [Image: '+q.img+']':'')+'. ';
  q.o.forEach((o,i)=>{text+=String.fromCharCode(1488+i)+'. '+o+'. ';});
  const u=new SpeechSynthesisUtterance(text);
  u.lang='he-IL';u.rate=0.9;
  u.onend=()=>{G.isSpeaking=false;G.render();};
  u.onerror=()=>{G.isSpeaking=false;G.render();};
  window.speechSynthesis.speak(u);G.isSpeaking=true;G.render();
}

export function startNextBestStep(){
  const re=/הצעד הבא|הטיפול המתאים|first[- ]line|הטיפול הראשוני|הגישה הנכונה/i;
  G.pool=[];
  G.QZ.forEach((q,i)=>{if(re.test(q.q))G.pool.push(i);});
  for(let i=G.pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.pool[i],G.pool[j]]=[G.pool[j],G.pool[i]];}
  G.qi=0;G.sel=null;G.ans=false;
  G._sessionOk=0;G._sessionNo=0;G._sessionBest={};G._sessionWorse={};G._sessionStart=Date.now();G._sessionSaved=false;G.filt='nbs';G.render();
}

export function startVoiceParser(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){toast('Speech Recognition not supported in this browser','info');return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();rec.lang='he-IL';rec.interimResults=false;rec.maxAlternatives=1;
  G.voiceListening=true;G.render();
  rec.onresult=e=>{
    G.voiceTranscript=e.results[0][0].transcript;G.voiceListening=false;
    const words=G.voiceTranscript.split(/\s+/).filter(w=>w.length>2);
    G.srchQ=words.join(' ');G.tab='search';G.render();
  };
  rec.onerror=()=>{G.voiceListening=false;G.render();};
  rec.onend=()=>{G.voiceListening=false;G.render();};
  rec.start();
}
