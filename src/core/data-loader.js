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
  // LCP fix (issue #82): distractors.json is ~2.5MB and is only consumed
  // in quiz-view.js:421 AFTER the user answers a question (`if(G.ans &&
  // !G.examMode)`). Eager-loading it in the startup Promise.all gates
  // first-paint on a fetch the user doesn't need for several seconds.
  // Strategy: load the critical 6 in the startup batch, then kick off
  // DIS on idle (requestIdleCallback / setTimeout fallback). quiz-view.js
  // already handles G.DIS being undefined — `const _dist=(G.DIS&&G.DIS[_qIdx])||null;`
  // — so the Distractor Autopsy block silently falls back to a generic
  // "correct answer" line until DIS arrives. The next render after load
  // shows the full rationales.
  const files = {
    QZ: 'questions.json',
    TK: 'topics.json',
    NOTES: 'notes.json',
    DRUGS: 'drugs.json',
    FLASH: 'flashcards.json',
    TABS: 'tabs.json',
  };
  try {
    const entries = Object.entries(files);
    const results = await Promise.all(
      entries.map(([varName, fileName]) =>
        fetch(basePath + fileName).then(r => {
          if (!r.ok) {
            throw new Error(varName + ': ' + r.status);
          }
          return r.json();
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
      });
    G._dataReady = true;
    // Deferred lazy-load of distractors.json — kick off after critical
    // payload arrives, on idle. Failure is non-fatal: G.DIS stays
    // undefined and quiz-view.js falls back gracefully.
    G.DIS = undefined;
    const loadDistractors = () => {
      fetch(basePath + 'distractors.json').then(r => {
        if (!r.ok) {
          if (r.status === 404) { G.DIS = {}; return; }
          throw new Error('DIS: ' + r.status);
        }
        return r.json();
      }).then(d => {
        if (d) G.DIS = d;
        // If the user is currently on a quiz card, trigger a re-render
        // so the Distractor Autopsy block populates. G.render() exists
        // app-wide; guard for unit-test environments where it doesn't.
        if (typeof G.render === 'function') {
          try { G.render(); } catch { /* render guard */ }
        }
      }).catch(err => {
        console.warn('distractors.json deferred load failed:', err && err.message);
        G.DIS = {};
      });
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(loadDistractors, { timeout: 3000 });
    } else {
      setTimeout(loadDistractors, 500);
    }
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
    if(_xAll.length){G.QZ.push(..._xAll);if(import.meta.env.DEV)console.log('Loaded '+_xAll.length+' user-generated questions');}
    if(import.meta.env.DEV)console.log('Data loaded: ' + G.QZ.length + ' questions, ' + G.NOTES.length + ' notes');
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
