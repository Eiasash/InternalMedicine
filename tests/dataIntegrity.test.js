import { readFileSync } from 'fs';
import { resolve } from 'path';

const dataDir = resolve(import.meta.dirname, '..', 'data');

function loadJSON(filename) {
  return JSON.parse(readFileSync(resolve(dataDir, filename), 'utf-8'));
}

// ── questions.json ──

describe('questions.json', () => {
  let questions;

  beforeAll(() => {
    questions = loadJSON('questions.json');
  });

  test('parses as valid JSON array', () => {
    expect(Array.isArray(questions)).toBe(true);
  });

  test('has more than 800 questions', () => {
    expect(questions.length).toBeGreaterThan(800);
  });

  test('every question has required fields: q, o, c, ti', () => {
    questions.forEach((q, _i) => {
      expect(q).toHaveProperty('q');
      expect(q).toHaveProperty('o');
      expect(q).toHaveProperty('c');
      expect(q).toHaveProperty('ti');
    });
  });

  test('every question has q as a non-empty string', () => {
    questions.forEach((q, _i) => {
      expect(typeof q.q).toBe('string');
      expect(q.q.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question has exactly 4 options', () => {
    questions.forEach((q, _i) => {
      expect(Array.isArray(q.o)).toBe(true);
      expect(q.o).toHaveLength(4);
    });
  });

  test('every option is a non-empty string', () => {
    questions.forEach((q, _i) => {
      q.o.forEach((opt, _j) => {
        expect(typeof opt).toBe('string');
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('correct answer index c is a number between 0 and 3', () => {
    questions.forEach((q, _i) => {
      expect(typeof q.c).toBe('number');
      expect(q.c).toBeGreaterThanOrEqual(0);
      expect(q.c).toBeLessThanOrEqual(3);
    });
  });

  test('correct answer index c is within bounds of options array', () => {
    questions.forEach((q, _i) => {
      expect(q.c).toBeLessThan(q.o.length);
    });
  });

  test('topic index ti is a number between 0 and 23', () => {
    questions.forEach((q, _i) => {
      expect(typeof q.ti).toBe('number');
      expect(q.ti).toBeGreaterThanOrEqual(0);
      expect(q.ti).toBeLessThanOrEqual(23);
    });
  });

  test('every topic (0-23) has at least 1 question', () => {
    const counts = {};
    questions.forEach(q => {
      counts[q.ti] = (counts[q.ti] || 0) + 1;
    });
    for (let ti = 0; ti <= 23; ti++) {
      expect(counts[ti] || 0).toBeGreaterThanOrEqual(1);
    }
  });

  test('no conflicting duplicates (same options but different correct answer)', () => {
    const seen = {};
    const conflicts = [];
    questions.forEach((q, i) => {
      const key = q.q.trim().substring(0, 80);
      if (seen[key] !== undefined) {
        const j = seen[key];
        const sameOpts = JSON.stringify(questions[i].o) === JSON.stringify(questions[j].o);
        const diffAnswer = questions[i].c !== questions[j].c;
        if (sameOpts && diffAnswer) {
          conflicts.push(`Q${j} (c=${questions[j].c}) vs Q${i} (c=${questions[i].c})`);
        }
      } else {
        seen[key] = i;
      }
    });
    expect(conflicts).toEqual([]);
  });

  test('no empty question text', () => {
    const empty = questions
      .map((q, i) => ({ i, q: q.q }))
      .filter(x => !x.q || x.q.trim().length === 0);
    expect(empty).toEqual([]);
  });

  test('no empty options', () => {
    const empty = [];
    questions.forEach((q, i) => {
      q.o.forEach((opt, j) => {
        if (!opt || opt.trim().length === 0) {
          empty.push(`Q${i} option ${j}`);
        }
      });
    });
    expect(empty).toEqual([]);
  });
});

// ── notes.json ──

describe('notes.json', () => {
  let notes;

  beforeAll(() => {
    notes = loadJSON('notes.json');
  });

  test('parses as valid JSON array', () => {
    expect(Array.isArray(notes)).toBe(true);
  });

  test('has at least 1 note', () => {
    expect(notes.length).toBeGreaterThan(0);
  });

  test('every note has topic and notes fields', () => {
    notes.forEach((n, _i) => {
      expect(n).toHaveProperty('topic');
      expect(typeof n.topic).toBe('string');
      expect(n.topic.trim().length).toBeGreaterThan(0);
      expect(n).toHaveProperty('notes');
      expect(typeof n.notes).toBe('string');
      expect(n.notes.trim().length).toBeGreaterThan(0);
    });
  });
});

// ── flashcards.json ──

describe('flashcards.json', () => {
  let flashcards;

  beforeAll(() => {
    flashcards = loadJSON('flashcards.json');
  });

  test('parses as valid JSON array', () => {
    expect(Array.isArray(flashcards)).toBe(true);
  });

  test('has at least 1 flashcard', () => {
    expect(flashcards.length).toBeGreaterThan(0);
  });

  test('every flashcard has f (front) and b (back) fields', () => {
    flashcards.forEach((fc, _i) => {
      expect(fc).toHaveProperty('f');
      expect(typeof fc.f).toBe('string');
      expect(fc.f.trim().length).toBeGreaterThan(0);
      expect(fc).toHaveProperty('b');
      expect(typeof fc.b).toBe('string');
      expect(fc.b.trim().length).toBeGreaterThan(0);
    });
  });
});

// ── drugs.json ──

describe('drugs.json', () => {
  let drugs;

  beforeAll(() => {
    drugs = loadJSON('drugs.json');
  });

  test('parses as valid JSON array', () => {
    expect(Array.isArray(drugs)).toBe(true);
  });

  test('has at least 1 drug', () => {
    expect(drugs.length).toBeGreaterThan(0);
  });

  test('every drug has required fields: name, heb, acb, beers, cat, risk', () => {
    const required = ['name', 'heb', 'acb', 'beers', 'cat', 'risk'];
    drugs.forEach((d, _i) => {
      required.forEach(key => {
        expect(d).toHaveProperty(key);
      });
    });
  });
});

// ── topics.json ──

describe('topics.json', () => {
  test('parses as valid JSON', () => {
    const topics = loadJSON('topics.json');
    expect(topics).toBeDefined();
  });
});

// ── tabs.json ──

describe('tabs.json', () => {
  test('parses as valid JSON', () => {
    const tabs = loadJSON('tabs.json');
    expect(tabs).toBeDefined();
  });
});

// ── doc currency: stale-question-count regression guard (2026-05-05) ──
//
// Pnimit's questions.json has grown from 1,472 → 1,556 over recent ingestion
// passes. README.md drifted at "1,472 MCQs" while CLAUDE.md was kept current
// at 1,556 — caught by web-Claude doc audit on 2026-05-05.
//
// This mirrors the Geri repo's STALE_COUNTS guard: scan repo-root docs for
// past Q-count totals, allow lines with explicit historical-context markers.
// To declare a new "current" total: drop the now-current number from
// STALE_COUNTS below. To document a past number legitimately: include
// `stale`, `obsolete`, `legacy`, `historical`, `pre-`, `(was`, or `CHANGELOG`
// on the same line.

describe('doc currency: stale Q-count regression guard', () => {
  test('repo-root docs have no current-state stale Q-count claims', () => {
    const repoRoot = resolve(import.meta.dirname, '..');
    const DOC_FILES = ['CLAUDE.md', 'README.md', 'IMPROVEMENTS.md'];
    // Past live totals that should never appear without a historical marker.
    // Add a new value here once questions.json has moved past it AND docs
    // have been refreshed.
    const STALE_COUNTS = ['1,472', '1472'];
    const HISTORICAL_MARKERS = [
      'stale', 'Stale', 'STALE',
      'obsolete', 'legacy', 'historical',
      'pre-', '(was', 'was ~', 'CHANGELOG',
    ];
    const fs = require('fs');
    const violations = [];
    for (const rel of DOC_FILES) {
      const abs = resolve(repoRoot, rel);
      if (!fs.existsSync(abs)) continue;
      const lines = fs.readFileSync(abs, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        const hits = STALE_COUNTS.filter((s) => line.includes(s));
        if (hits.length === 0) return;
        const exempt = HISTORICAL_MARKERS.some((m) => line.includes(m));
        if (!exempt) {
          violations.push(
            `${rel}:${i + 1}: stale count [${hits.join(', ')}] without historical marker — line: ${line.trim().slice(0, 120)}`
          );
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
