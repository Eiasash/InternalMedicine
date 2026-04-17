// Header clock — runs as a side effect on import.
// Called from app.js (module), which loads deferred, so the DOM is already parsed.
(function initClock(){
  const el=document.getElementById('hdr-sub');
  if(!el)return;
  function upd(){
    const d=new Date();
    const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const h=String(d.getHours()).padStart(2,'0');
    const m=String(d.getMinutes()).padStart(2,'0');
    const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    el.textContent=day+' '+d.getDate()+' '+mon+' · '+h+':'+m;
  }
  upd();setInterval(upd,30000);
})();
