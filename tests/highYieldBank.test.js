// highYieldBank.test.js — locks the separate AI high-yield bank (data/highyield.json) and
// its app wiring. This bank is deliberately NOT merged into data/questions.json (so it leaves
// the count-lock + cross-repo corpus-manifest/Geri-syllabus contract untouched); it is loaded
// additively by src/core/data-loader.js and labeled "AI — High-Yield" in the quiz UI.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const HY_PATH = resolve(root, 'data/highyield.json');
const TI_MAX = 23; // Pnimit topics ti 0..23
const TAG = 'AI-2026-hy';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

describe('high-yield AI bank (data/highyield.json)', () => {
  it('exists and is a non-empty JSON array', () => {
    expect(existsSync(HY_PATH)).toBe(true);
    const a = load(HY_PATH);
    expect(Array.isArray(a)).toBe(true);
    expect(a.length).toBeGreaterThan(0);
  });

  it('every question is schema-valid, AI-2026-hy tagged, and key-consistent', () => {
    const a = load(HY_PATH);
    const errs = [];
    a.forEach((q, i) => {
      if (typeof q.q !== 'string' || q.q.trim().length < 10) errs.push(`#${i} bad q`);
      if (
        !Array.isArray(q.o) ||
        q.o.length !== 4 ||
        q.o.some((o) => typeof o !== 'string' || !o.trim())
      )
        errs.push(`#${i} bad options`);
      if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) errs.push(`#${i} bad c=${q.c}`);
      if (!Array.isArray(q.c_accept) || !q.c_accept.includes(q.c))
        errs.push(`#${i} c not in c_accept`);
      if (!Number.isInteger(q.ti) || q.ti < 0 || q.ti > TI_MAX) errs.push(`#${i} bad ti=${q.ti}`);
      if (q.t !== TAG) errs.push(`#${i} tag=${q.t} (expected ${TAG})`);
      if (typeof q.e !== 'string' || q.e.trim().length < 20) errs.push(`#${i} short explanation`);
    });
    expect(errs.slice(0, 10)).toEqual([]);
  });

  it('options within each question are unique (no duplicate distractors)', () => {
    const a = load(HY_PATH);
    const bad = [];
    a.forEach((q, i) => {
      if (new Set(q.o.map((x) => String(x).trim().toLowerCase())).size !== q.o.length) bad.push(i);
    });
    expect(bad).toEqual([]);
  });

  it('does not collide with the main exam bank (first-80-char prefix dedup)', () => {
    const a = load(HY_PATH);
    const bank = load(resolve(root, 'data/questions.json'));
    const seen = new Set(bank.map((q) => String(q.q).slice(0, 80).toLowerCase()));
    const dupes = a.filter((q) => seen.has(String(q.q).slice(0, 80).toLowerCase()));
    expect(dupes.length).toBe(0);
  });

  it('is wired into the loader, service worker, and build precache', () => {
    expect(readFileSync(resolve(root, 'src/core/data-loader.js'), 'utf8')).toContain(
      'highyield.json',
    );
    expect(readFileSync(resolve(root, 'sw.js'), 'utf8')).toContain('data/highyield.json');
    expect(readFileSync(resolve(root, 'scripts/build.sh'), 'utf8')).toContain(
      'data/highyield.json',
    );
  });

  it('is transparently labeled as AI-generated in the quiz UI', () => {
    expect(readFileSync(resolve(root, 'src/ui/quiz-view.js'), 'utf8')).toContain('AI-2026-hy');
  });
});
