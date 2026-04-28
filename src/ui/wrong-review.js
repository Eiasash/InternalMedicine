// Wrong-answer review mode — persistent set of question indices the user got wrong,
// scored by recency × topic-weight. Cleared per question after 2 consecutive correct.
//
// Persistence: IndexedDB store (object store: 'wrong_review', key: 'set'). Falls back
// to localStorage when IDB is unavailable (test/SSR/private mode). The full set lives
// in G.wrongSet (a Map: qIdx → {ts, streak}) so reads are zero-cost in render hot paths.
import G from '../core/globals.js';
import { TOPICS, EXAM_FREQ } from '../core/constants.js';

const LS_KEY = 'pnimit_wrong_review_v1';
const IDB_NAME = 'pnimit_mega_db';
const IDB_STORE = 'wrong_review';
const IDB_VER = 1;
const SET_KEY = 'set';

// Lazy IDB handle — separate from the main app db so we don't fight schema versions.
let _wrDb = null;
let _wrDbPromise = null;
function openWRDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (_wrDb) return Promise.resolve(_wrDb);
  if (_wrDbPromise) return _wrDbPromise;
  _wrDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME + '_wr', IDB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = (e) => { _wrDb = e.target.result; resolve(_wrDb); };
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return _wrDbPromise;
}

// Serialize Map → plain object for storage.
function serializeSet(set) {
  const out = {};
  set.forEach((v, k) => { out[String(k)] = v; });
  return out;
}
function deserializeSet(obj) {
  const m = new Map();
  if (!obj || typeof obj !== 'object') return m;
  Object.entries(obj).forEach(([k, v]) => {
    const idx = parseInt(k, 10);
    if (!Number.isFinite(idx)) return;
    if (!v || typeof v !== 'object') return;
    m.set(idx, { ts: Number(v.ts) || Date.now(), streak: Number(v.streak) || 0 });
  });
  return m;
}

// Initial load. Idempotent — safe to call multiple times.
export async function loadWrongSet() {
  if (G.wrongSet instanceof Map) return G.wrongSet;
  G.wrongSet = new Map();
  const db = await openWRDB();
  if (db) {
    try {
      const got = await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(SET_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (got) { G.wrongSet = deserializeSet(got); return G.wrongSet; }
    } catch (e) { /* fall through to LS */ }
  }
  // localStorage fallback
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) G.wrongSet = deserializeSet(JSON.parse(raw));
  } catch (e) { /* keep empty Map */ }
  return G.wrongSet;
}

// Persist with debounce. Best-effort to both IDB and LS.
let _saveTimer = null;
export function saveWrongSet() {
  if (!(G.wrongSet instanceof Map)) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const ser = serializeSet(G.wrongSet);
    try { localStorage.setItem(LS_KEY, JSON.stringify(ser)); } catch (e) { /* quota */ }
    openWRDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(ser, SET_KEY);
      } catch (e) { /* ignore */ }
    });
  }, 150);
}

// Record a result for a question. correct=true increments the per-q streak;
// after 2 consecutive correct the question leaves the set. correct=false
// (re)adds the question and resets the streak.
export function recordResult(qIdx, correct) {
  if (!(G.wrongSet instanceof Map)) G.wrongSet = new Map();
  if (!Number.isFinite(qIdx)) return;
  const cur = G.wrongSet.get(qIdx);
  if (!correct) {
    G.wrongSet.set(qIdx, { ts: Date.now(), streak: 0 });
    saveWrongSet();
    return;
  }
  if (!cur) return; // not in set, nothing to update
  const nextStreak = (cur.streak || 0) + 1;
  if (nextStreak >= 2) {
    G.wrongSet.delete(qIdx);
  } else {
    G.wrongSet.set(qIdx, { ts: cur.ts, streak: nextStreak });
  }
  saveWrongSet();
}

// Number of currently-tracked wrong questions.
export function wrongCount() {
  return G.wrongSet instanceof Map ? G.wrongSet.size : 0;
}

// Build an ordered pool: recency × topic weight. Exposed pure so tests can call.
// `now` defaults to Date.now() so tests can pin the clock.
export function buildWrongPool(QZ, wrongSet, weights, now = Date.now()) {
  if (!(wrongSet instanceof Map) || wrongSet.size === 0 || !Array.isArray(QZ)) return [];
  const maxWeight = Math.max(1, ...weights);
  const items = [];
  wrongSet.forEach((meta, idx) => {
    const q = QZ[idx];
    if (!q) return;
    const ageDays = Math.max(0, (now - (meta.ts || now)) / 86400000);
    // recency: half-life 30 days → score = 0.5^(ageDays/30). New entries score ≈1.
    const recency = Math.pow(0.5, ageDays / 30);
    const tWeight = (q.ti >= 0 && q.ti < weights.length ? weights[q.ti] : 1) / maxWeight;
    const score = recency * (0.4 + 0.6 * tWeight); // floor topic weight so low-weight topics still surface
    items.push({ idx, score });
  });
  items.sort((a, b) => b.score - a.score);
  return items.map(x => x.idx);
}

// Wire up: enter wrong-answer review mode. Builds G.pool, sets a sentinel filter,
// and asks the app to render. The sentinel `filt='wrong'` is recognised inside
// quiz/engine.js#buildPool (added in the same change).
export function startWrongReview() {
  if (!(G.wrongSet instanceof Map) || G.wrongSet.size === 0) {
    if (typeof G.toast === 'function') G.toast('No wrong answers logged yet','info');
    return;
  }
  const pool = buildWrongPool(G.QZ, G.wrongSet, EXAM_FREQ);
  if (!pool.length) return;
  G.pool = pool;
  G.qi = 0; G.sel = null; G.ans = false;
  G.filt = 'wrong'; G.topicFilt = -1; G.years = [];
  G.tab = 'quiz';
  if (typeof G.render === 'function') G.render();
}

// Convenience for tests / external callers.
export function _resetForTests() {
  G.wrongSet = new Map();
  _wrDb = null; _wrDbPromise = null;
  try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
}
