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
    QZ: 'questions.json',
    TK: 'topics.json',
    NOTES: 'notes.json',
    DRUGS: 'drugs.json',
    FLASH: 'flashcards.json',
    TABS: 'tabs.json',
    DIS: 'distractors.json',
  };
  try {
    const entries = Object.entries(files);
    const results = await Promise.all(
      entries.map(([varName, fileName]) =>
        fetch(basePath + fileName).then(r => {
          if (!r.ok) {
            // DIS is optional: missing distractors.json should not break data load
            if (varName === 'DIS') return {};
            throw new Error(varName + ': ' + r.status);
          }
          return r.json();
        }).catch(err => {
          if (varName === 'DIS') { console.warn('distractors.json unavailable:', err.message); return {}; }
          throw err;
        })
      )
    );
    entries.forEach(([varName], i) => {
      if (varName === 'QZ') G.QZ = results[i];
      else if (varName === 'TK') G.TK = results[i];
      else if (varName === 'NOTES') G.NOTES = results[i];
      else if (varName === 'DRUGS') G.DRUGS = results[i];
      else if (varName === 'FLASH') G.FLASH = results[i];
      else if (varName === 'TABS') G.TABS = results[i];
      else if (varName === 'DIS') G.DIS = results[i];
      });
    G._dataReady = true;
    // Build NOTES_BY_TI: map topic index → note object
    // notes.json is NOT aligned with TOPICS[] positional index (21/24 mismatches).
    // Match by normalized topic-name string (strip " — suffix", case-insensitive).
    try {
      const { TOPICS } = await import('./constants.js');
      const normalize = s => String(s||'').split('—')[0].trim().toLowerCase();
      G.NOTES_BY_TI = {};
      const topicKeys = TOPICS.map(normalize);
      (G.NOTES||[]).forEach(note => {
        const nk = normalize(note.topic);
        // exact match
        let ti = topicKeys.indexOf(nk);
        // loose match (substring both ways) if no exact
        if (ti < 0) ti = topicKeys.findIndex(tk => tk && nk && (tk.includes(nk) || nk.includes(tk)));
        if (ti >= 0 && G.NOTES_BY_TI[ti] === undefined) G.NOTES_BY_TI[ti] = note;
      });
    } catch (e) {
      console.warn('NOTES_BY_TI build failed:', e);
      G.NOTES_BY_TI = {};
    }
    const _xp=safeJSONParse('pnimit_pending_qs',[]);
    const _xc=safeJSONParse('pnimit_custom_qs',[]);
    const _xAll=[..._xp,..._xc].filter(q=>q&&typeof q.q==='string'&&Array.isArray(q.o)&&q.o.length===4&&Number.isInteger(q.c)&&q.c>=0&&q.c<=3&&typeof q.ti==='number');
    if(_xAll.length){G.QZ.push(..._xAll);console.log('Loaded '+_xAll.length+' user-generated questions');}
    console.log('Data loaded: ' + G.QZ.length + ' questions, ' + G.NOTES.length + ' notes');
    if(window.takeWeeklySnapshot)window.takeWeeklySnapshot();
  } catch (error) {
    console.error('Data load failed:', error);
    var ct = document.getElementById('ct');
    if (ct) {
      ct.innerHTML = '<div style="padding:20px;color:red;text-align:center">' +
        '<b>Error loading data</b><br>Please refresh or try again.' +
        '<br><small>' + sanitize(error.message) + '</small>' +
        '<br><button id="pnimit-retry-btn" style="margin-top:12px;padding:6px 14px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px">Retry</button>' +
        '</div>';
      var _retryBtn = document.getElementById('pnimit-retry-btn');
      if (_retryBtn) _retryBtn.addEventListener('click', () => location.reload());
    }
    throw error;
  }
})();
