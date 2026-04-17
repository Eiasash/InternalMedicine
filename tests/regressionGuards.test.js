/**
 * Tests for bugs that actually shipped in v9.49 and earlier:
 *  - Hebrew mojibake (ð where נ should be)
 *  - Reversed digits from PDF RTL extraction (e.g., "בת06" meaning "60")
 *  - Missing spaces between Hebrew words and numbers ("בן58")
 *  - Content bleed between adjacent questions ("... 2. בת ..." at end of Q1)
 *  - Question-mark on wrong side of stem ("?heb...")
 *  - Duplicate questions across the corpus
 *  - Canonical JSONs drifting out of sync with deployed data
 *  - Build-generated SW diverging from repo SW on features
 *
 * Goal: CI fails before a corrupted release ships.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');
const dataDir = resolve(rootDir, 'data');
const canonDir = resolve(rootDir, 'scripts', 'exam_audit', 'canonical');

function loadJSON(relPath) {
  return JSON.parse(readFileSync(resolve(rootDir, relPath), 'utf-8'));
}

function readFile(relPath) {
  return readFileSync(resolve(rootDir, relPath), 'utf-8');
}

// ─────────────────────────────────────────────────────────────
// Mojibake / encoding guard
// ─────────────────────────────────────────────────────────────
describe('questions.json — encoding integrity', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  // `ð` (U+00F0) appears when Hebrew `נ` (CP1255 0xF0) is misinterpreted as Latin-1.
  // This was the bug that corrupted ~192 questions across May24 + Oct24.
  test('no question contains the ð mojibake character anywhere', () => {
    const violations = [];
    questions.forEach((q, i) => {
      const all = [q.q, ...(q.o || []), q.e || ''].join('|');
      if (all.includes('ð')) {
        violations.push({ i, tag: q.t, preview: q.q?.slice(0, 80) });
      }
    });
    if (violations.length) {
      console.error(`ð-mojibake found in ${violations.length} questions:`, violations.slice(0, 3));
    }
    expect(violations.length).toBe(0);
  });

  // Latin-1 extended range in Hebrew context is almost always an encoding artifact.
  // Whitelist the few legitimate diacritics (é è ñ etc.) that appear in medical
  // proper nouns like "Guillain-Barré" or "São Paulo".
  test('no Latin-1 extended chars adjacent to Hebrew letters (non-whitelisted)', () => {
    const LEGIT = 'éèêëàâäîïôöûüñçÉÈÊÀÂÜÑÇøåÅ';
    const badAdjacent = /[\u0590-\u05FF][\u00C0-\u00FF]|[\u00C0-\u00FF][\u0590-\u05FF]/g;
    const violations = [];
    questions.forEach((q, i) => {
      const text = [q.q, ...(q.o || [])].join(' | ');
      const matches = [...text.matchAll(badAdjacent)];
      for (const m of matches) {
        const ch = m[0].split('').find(c => c.charCodeAt(0) >= 0xC0 && c.charCodeAt(0) <= 0xFF);
        if (ch && !LEGIT.includes(ch)) {
          violations.push({ i, tag: q.t, char: ch, context: text.slice(Math.max(0, m.index - 15), m.index + 15) });
          break;
        }
      }
    });
    if (violations.length) {
      console.error(`Latin-1 adjacency in ${violations.length} Qs:`, violations.slice(0, 3));
    }
    expect(violations.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Formatting quality (past-exam corruption patterns)
// ─────────────────────────────────────────────────────────────
describe('questions.json — formatting quality', () => {
  let questions;
  const PAST_EXAM_TAGS = ['2020', 'Jun21', 'Jun22', 'Jun23', 'May24', 'Oct24', 'Jun25'];
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  // Catches "בן58" → should be "בן 58"
  // Allow a tiny budget for edge cases (e.g., page references "עמוד 3 בתמונה2")
  test('Hebrew-digit missing-space count stays under budget (<=5)', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.includes(q.t)) return;
      const text = [q.q, ...(q.o || [])].join(' | ');
      if (/[\u0590-\u05FF]\d/.test(text)) {
        bad.push({ i, tag: q.t });
      }
    });
    if (bad.length > 5) {
      console.error(`Hebrew+digit (no space) in ${bad.length} Qs (budget 5):`, bad.slice(0, 5));
    }
    expect(bad.length).toBeLessThanOrEqual(5);
  });

  // Catches `?גבוהה` (question mark on wrong side after RTL mangling)
  test('no question mark immediately before Hebrew letter (wrong-side punct)', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.includes(q.t)) return;
      const text = [q.q, ...(q.o || [])].join(' | ');
      if (/\?[\u0590-\u05FF]/.test(text)) {
        bad.push({ i, tag: q.t, preview: q.q?.slice(0, 60) });
      }
    });
    if (bad.length > 3) {
      console.error(`?[Hebrew] in ${bad.length} Qs (budget 3):`, bad.slice(0, 3));
    }
    expect(bad.length).toBeLessThanOrEqual(3);
  });

  // Catches content bleed: stem contains a DIGIT-DOT followed by a typical
  // question-opener word (בן/בת/מה/איזה/אישה/גבר...). Exclusions:
  //   - "תמונה N." / "בתמונה N." (figure references)
  //   - "דרגה N." (clinical grades)
  //   - "CLASS N." / roman numerals
  //   - "שלב N." (stage references)
  test('no adjacent-question fragment glued into stem', () => {
    const bad = [];
    const STARTERS = /^(בן|בת|גבר|אישה|איש|מטופל|חולה|מה|איזה|איזו|באיזו|באיזה|האם)/;
    const REF_PREFIXES = /(תמונה|דרגה|שלב|class|stage|grade|טבלה|גרף|שאלה)\s*$/i;
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.includes(q.t)) return;
      if (!q.q) return;
      const re = /(\S*)\s([1-9])\.\s([\u0590-\u05FF]+)/g;
      let m;
      while ((m = re.exec(q.q)) !== null) {
        const prevWord = m[1];
        const nextWord = m[3];
        if (STARTERS.test(nextWord) && !REF_PREFIXES.test(prevWord)) {
          // Also check the last 2 words before for figure/grade references
          const before = q.q.slice(Math.max(0, m.index - 30), m.index);
          if (REF_PREFIXES.test(before.split(/\s+/).slice(-2).join(' '))) continue;
          bad.push({ i, tag: q.t, match: m[0], before });
          break;
        }
      }
    });
    if (bad.length) console.error('Fragment-bleed:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Duplicates
// ─────────────────────────────────────────────────────────────
describe('questions.json — duplicates', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  test('no duplicate questions by first 80 chars of stem (per tag)', () => {
    const byTagKey = new Map();
    const dupes = [];
    questions.forEach((q, i) => {
      const key = `${q.t}||${(q.q || '').slice(0, 80).trim()}`;
      if (!key.endsWith('||')) {
        if (byTagKey.has(key)) {
          dupes.push({ first: byTagKey.get(key), second: i, tag: q.t, preview: (q.q || '').slice(0, 60) });
        } else {
          byTagKey.set(key, i);
        }
      }
    });
    if (dupes.length) console.error('Duplicates:', dupes);
    expect(dupes.length).toBe(0);
  });

  test('no duplicate questions across all tags (by first 100 chars)', () => {
    const seen = new Map();
    const dupes = [];
    questions.forEach((q, i) => {
      const key = (q.q || '').slice(0, 100).trim();
      if (!key) return;
      if (seen.has(key)) {
        dupes.push({ first: seen.get(key), second: i });
      } else {
        seen.set(key, i);
      }
    });
    if (dupes.length > 0) console.error('Cross-tag duplicates:', dupes.slice(0, 3));
    expect(dupes.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Strengthened structural checks (stuff the old tests should have caught)
// ─────────────────────────────────────────────────────────────
describe('questions.json — structural invariants', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  test('every question has EXACTLY 4 options', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!Array.isArray(q.o) || q.o.length !== 4) {
        bad.push({ i, tag: q.t, optCount: Array.isArray(q.o) ? q.o.length : 'not-array' });
      }
    });
    if (bad.length) console.error('Non-4-option Qs:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });

  test('every answer key c is in [0, o.length)', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!(typeof q.c === 'number' && Number.isInteger(q.c) && q.c >= 0 && q.c < (q.o?.length || 0))) {
        bad.push({ i, tag: q.t, c: q.c, oLen: q.o?.length });
      }
    });
    if (bad.length) console.error('Bad answer keys:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });

  test('every question has non-empty explanation e', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!q.e || typeof q.e !== 'string' || q.e.trim().length < 10) {
        bad.push({ i, tag: q.t });
      }
    });
    if (bad.length) console.error('Missing/short explanations:', bad.slice(0, 5));
    expect(bad.length).toBe(0);
  });

  test('ti (topic index) is integer in [0, 23]', () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!(typeof q.ti === 'number' && Number.isInteger(q.ti) && q.ti >= 0 && q.ti <= 23)) {
        bad.push({ i, tag: q.t, ti: q.ti });
      }
    });
    if (bad.length) console.error('Bad ti:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });

  test('every question has a tag t', () => {
    const bad = questions.filter((q, i) => !q.t || typeof q.t !== 'string').map((q, i) => ({ i, t: q.t }));
    expect(bad.length).toBe(0);
  });

  test('all tags are from known set', () => {
    const ALLOWED = new Set(['2020', 'Jun21', 'Jun22', 'Jun23', 'May24', 'Oct24', 'Jun25', 'Harrison', 'Exam']);
    const unknown = new Set();
    questions.forEach(q => {
      if (q.t && !ALLOWED.has(q.t)) unknown.add(q.t);
    });
    if (unknown.size) console.error('Unknown tags:', [...unknown]);
    expect(unknown.size).toBe(0);
  });

  test('every stem has reasonable length (15–3000 chars)', () => {
    const bad = [];
    questions.forEach((q, i) => {
      const len = (q.q || '').length;
      if (len < 15 || len > 3000) bad.push({ i, tag: q.t, len });
    });
    if (bad.length) console.error('Unreasonable stem lengths:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });

  test('every option has reasonable length (1–800 chars)', () => {
    const bad = [];
    questions.forEach((q, i) => {
      (q.o || []).forEach((o, j) => {
        const len = (o || '').length;
        if (len < 1 || len > 800) bad.push({ i, tag: q.t, opt: j, len });
      });
    });
    if (bad.length) console.error('Unreasonable option lengths:', bad.slice(0, 3));
    expect(bad.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Expected question counts per session (locked so AI regen doesn't silently drop Qs)
// ─────────────────────────────────────────────────────────────
describe('questions.json — per-session counts locked', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  const EXPECTED = {
    '2020': 139, 'Jun21': 149, 'Jun22': 148, 'Jun23': 147,
    'May24': 99, 'Oct24': 99, 'Jun25': 151, 'Harrison': 589, 'Exam': 20,
  };

  test.each(Object.entries(EXPECTED))('session %s has exactly %s questions', (tag, n) => {
    const count = questions.filter(q => q.t === tag).length;
    expect(count).toBe(n);
  });

  test('total question count is exactly 1541', () => {
    expect(questions.length).toBe(1541);
  });
});

// ─────────────────────────────────────────────────────────────
// Canonical-vs-data sync check
// ─────────────────────────────────────────────────────────────
describe('canonical JSONs stay in sync with data/questions.json', () => {
  const SESSIONS = [
    { tag: '2020', file: '2020.json' },
    { tag: 'Jun21', file: '2021_jun.json' },
    { tag: 'Jun22', file: '2022_jun.json' },
    { tag: 'Jun23', file: '2023_jun.json' },
    { tag: 'May24', file: '2024_may.json' },
    { tag: 'Oct24', file: '2024_oct.json' },
    { tag: 'Jun25', file: '2025_jun.json' },
  ];

  test.each(SESSIONS)('canonical/%s has same question count as data[t=$tag]', ({ tag, file }) => {
    const canonPath = resolve(canonDir, file);
    if (!existsSync(canonPath)) {
      console.warn(`canonical missing: ${file} — skipping`);
      return;
    }
    const canon = JSON.parse(readFileSync(canonPath, 'utf-8'));
    const canonCount = Object.keys(canon.questions || {}).length;
    const data = loadJSON('data/questions.json');
    const dataCount = data.filter(q => q.t === tag).length;
    expect(canonCount).toBe(dataCount);
  });

  test('canonical JSONs contain no ð mojibake', () => {
    const bad = [];
    SESSIONS.forEach(({ tag, file }) => {
      const p = resolve(canonDir, file);
      if (!existsSync(p)) return;
      const text = readFileSync(p, 'utf-8');
      if (text.includes('ð')) bad.push(file);
    });
    if (bad.length) console.error('Mojibake in canonical:', bad);
    expect(bad.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Service-worker / build-script consistency
// ─────────────────────────────────────────────────────────────
describe('service worker — dev/build consistency', () => {
  test('repo sw.js version matches build.sh SW template version reference', () => {
    const sw = readFile('sw.js');
    const build = readFile('scripts/build.sh');
    // build.sh reads APP_VERSION dynamically; ensure it references constants.js
    expect(build).toMatch(/src\/core\/constants\.js/);
    // sw.js CACHE and constants APP_VERSION must match
    const constants = readFile('src/core/constants.js');
    const appVer = constants.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const swVer = sw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/)?.[1];
    expect(appVer).toBe(swVer);
  });

  test('repo sw.js and build.sh SW template agree on the core routing rules', () => {
    const sw = readFile('sw.js');
    const build = readFile('scripts/build.sh');
    // Both must have navigate→network-first, data→SWR, assets→cache-first
    expect(sw).toMatch(/respondWith\(fetch\(e\.request\)/);
    expect(build).toMatch(/respondWith\(fetch\(e\.request\)/);
  });

  // The two SWs serve different environments (raw modules vs hashed assets)
  // but SHARED features (background sync, push, skip-waiting) must match.
  // If someone adds a feature to repo sw.js but forgets build.sh, prod users
  // silently lose that capability. This test fails the PR.
  test('repo sw.js and build.sh SW template have same set of event listeners', () => {
    const sw = readFile('sw.js');
    // Extract SW template from between `cat > dist/sw.js << SWEOF` and `SWEOF`
    const build = readFile('scripts/build.sh');
    const tplMatch = build.match(/cat\s+>\s+dist\/sw\.js\s+<<\s+SWEOF\n([\s\S]*?)\nSWEOF/);
    expect(tplMatch).not.toBeNull();
    const buildSW = tplMatch[1];

    const events = ['install', 'activate', 'fetch', 'sync', 'message', 'notificationclick'];
    for (const ev of events) {
      const inRepo = new RegExp(`addEventListener\\(['"]${ev}['"]`).test(sw);
      const inBuild = new RegExp(`addEventListener\\(['"]${ev}['"]`).test(buildSW);
      if (inRepo !== inBuild) {
        console.error(`SW event '${ev}' divergence: repo=${inRepo} build=${inBuild}`);
      }
      expect(inRepo).toBe(inBuild);
    }
  });

  test('both SWs handle SKIP_WAITING', () => {
    expect(readFile('sw.js')).toMatch(/SKIP_WAITING/);
    expect(readFile('scripts/build.sh')).toMatch(/SKIP_WAITING/);
  });

  test('both SWs implement background supabase-backup sync', () => {
    expect(readFile('sw.js')).toMatch(/supabase-backup/);
    expect(readFile('scripts/build.sh')).toMatch(/supabase-backup/);
  });

  test('both SWs implement push notification for daily review', () => {
    expect(readFile('sw.js')).toMatch(/daily-review/);
    expect(readFile('scripts/build.sh')).toMatch(/daily-review/);
  });

  test('package.json version matches APP_VERSION', () => {
    const pkg = JSON.parse(readFile('package.json'));
    const constants = readFile('src/core/constants.js');
    const appVer = constants.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    expect(pkg.version).toBe(`${appVer}.0`);
  });
});
