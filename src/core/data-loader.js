import G from './globals.js';
import { safeJSONParse, sanitize } from './utils.js';

// Data loader + data arrays — extracted from pnimit-mega.html
// Depends on: safeJSONParse (utils.js), sanitize (utils.js), takeWeeklySnapshot (still in HTML)

// ===== AUTO TOPIC TAGGING =====
G.QZ.forEach(q=>{
const txt=(q.q+' '+q.o.join(' ')).toLowerCase();
let best=-1,mx=0;
G.TK.forEach((keys,ti)=>{let sc=0;keys.forEach(k=>{if(txt.includes(k.toLowerCase()))sc++;});if(sc>mx){mx=sc;best=ti;}});
q.ti=best>=0?best:8;
});

// ===== G.TABS =====

// ===== DATA LOADER (v10.0) =====
G._dataPromise = (async function loadDataArrays() {
  const basePath = './data/';
  const files = {
    G.QZ: 'questions.json',
    G.TK: 'topics.json',
    G.NOTES: 'notes.json',
    G.DRUGS: 'drugs.json',
    G.FLASH: 'flashcards.json',
    G.TABS: 'tabs.json',
  };
  try {
    const entries = Object.entries(files);
    const results = await Promise.all(
      entries.map(([varName, fileName]) =>
        fetch(basePath + fileName).then(r => {
          if (!r.ok) throw new Error(varName + ': ' + r.status);
          return r.json();
        })
      )
    );
    entries.forEach(([varName], i) => {
      if (varName === 'G.QZ') G.QZ = results[i];
      else if (varName === 'G.TK') G.TK = results[i];
      else if (varName === 'G.NOTES') G.NOTES = results[i];
      else if (varName === 'G.DRUGS') G.DRUGS = results[i];
      else if (varName === 'G.FLASH') G.FLASH = results[i];
      else if (varName === 'G.TABS') G.TABS = results[i];
      });
    G._dataReady = true;
    const _xp=safeJSONParse('pnimit_pending_qs',[]);
    const _xc=safeJSONParse('pnimit_custom_qs',[]);
    const _xAll=[..._xp,..._xc].filter(q=>q&&typeof q.q==='string'&&Array.isArray(q.o)&&q.o.length===4&&Number.isInteger(q.c)&&q.c>=0&&q.c<=3&&typeof q.ti==='number');
    if(_xAll.length){G.QZ.push(..._xAll);console.log('Loaded '+_xAll.length+' user-generated questions');}
    console.log('Data loaded: ' + G.QZ.length + ' questions, ' + G.NOTES.length + ' notes');
    if(window.takeWeeklySnapshot)window.takeWeeklySnapshot();
  } catch (error) {
    console.error('Data load failed:', error);
    var ct = document.getElementById('ct');
    if (ct) ct.innerHTML = '<div style="padding:20px;color:red;text-align:center">' +
      '<b>Error loading data</b><br>Please refresh the page or clear cache.' +
      '<br><small>' + sanitize(error.message) + '</small></div>';
    throw error;
  }
})();
