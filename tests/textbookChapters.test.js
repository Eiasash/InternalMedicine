/**
 * Schema validation for the Harrison 22e chapter reader.
 *
 * harrison_chapters.json (~3.9 MB) is the single source for the in-app
 * Harrison reader, the per-question "📗 Harrison Ch …" deep-link pills,
 * and the AI chapter tools in library-view. Silently malformed entries
 * surface as a blank reader pane on the user's phone with no console
 * error — the existing dataIntegrity / expandedDataIntegrity suites do
 * not exercise this file at all.
 *
 * These tests pin:
 *   - shape: { title:string, sections:[{title, content[]}], wordCount:number }
 *   - chapter ids are positive integers (Harrison chapters are not numbered
 *     contiguously — only chapters relevant to the P0064-2025 syllabus are
 *     included — so we don't enforce a contiguous range, only positivity)
 *   - every chapter has a non-empty title and at least one section
 *   - sections are well-formed (title:string, content:array of strings)
 *   - word counts are plausible (no zero-length parser bleeds)
 *
 * Plus reverse cross-references that the existing suites don't cover:
 *   - every drug entry has the canonical 6-field schema (name/heb/acb/beers/cat/risk)
 *   - tabs.json defines exactly the 5 navigation tabs the renderTabs() loop expects
 *   - topics.json has 24 topics (one per `ti` index) with non-empty keyword arrays
 */

import { describe, it, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA = resolve(ROOT, 'data');

function load(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), 'utf-8'));
}
function loadData(file) {
  return JSON.parse(readFileSync(resolve(DATA, file), 'utf-8'));
}

describe('harrison_chapters.json — schema', () => {
  let harrison;
  beforeAll(() => {
    harrison = load('harrison_chapters.json');
  });

  it('parses as a non-array object keyed by chapter id', () => {
    expect(typeof harrison).toBe('object');
    expect(harrison).not.toBeNull();
    expect(Array.isArray(harrison)).toBe(false);
  });

  it('has at least 60 chapters (Harrison 22e syllabus subset)', () => {
    expect(Object.keys(harrison).length).toBeGreaterThanOrEqual(60);
  });

  it('every key is a positive integer', () => {
    for (const k of Object.keys(harrison)) {
      const n = Number(k);
      expect(Number.isInteger(n), `key ${k} is not an integer`).toBe(true);
      expect(n, `key ${k} must be >= 1`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every chapter has title (non-empty string), sections (array), wordCount (number)', () => {
    const bad = [];
    for (const [k, ch] of Object.entries(harrison)) {
      if (typeof ch.title !== 'string' || ch.title.trim().length === 0) bad.push({ k, why: 'title' });
      if (!Array.isArray(ch.sections)) bad.push({ k, why: 'sections-not-array' });
      if (typeof ch.wordCount !== 'number') bad.push({ k, why: 'wordCount' });
    }
    expect(bad).toEqual([]);
  });

  it('every section has title (string) and content (array of strings)', () => {
    const bad = [];
    for (const [k, ch] of Object.entries(harrison)) {
      ch.sections.forEach((s, i) => {
        if (typeof s.title !== 'string') bad.push({ k, i, why: 's.title' });
        if (!Array.isArray(s.content)) bad.push({ k, i, why: 's.content' });
        else {
          for (let j = 0; j < s.content.length; j++) {
            if (typeof s.content[j] !== 'string') {
              bad.push({ k, i, j, why: 's.content[j]' });
              break;
            }
          }
        }
      });
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it('every chapter has at least one section (no empty parses)', () => {
    const empty = Object.entries(harrison)
      .filter(([, ch]) => ch.sections.length === 0)
      .map(([k]) => k);
    expect(empty, `empty: ${empty.join(',')}`).toEqual([]);
  });

  it('average wordCount > 100 (no whole-book parser bleed)', () => {
    const total = Object.values(harrison).reduce((a, ch) => a + ch.wordCount, 0);
    const avg = total / Object.keys(harrison).length;
    expect(avg).toBeGreaterThan(100);
  });

  it('no chapter has wordCount 0', () => {
    const zeroes = Object.entries(harrison)
      .filter(([, ch]) => ch.wordCount === 0)
      .map(([k]) => k);
    expect(zeroes).toEqual([]);
  });
});

describe('drugs.json — schema', () => {
  let drugs;
  beforeAll(() => {
    drugs = loadData('drugs.json');
  });

  it('is a non-empty array', () => {
    expect(Array.isArray(drugs)).toBe(true);
    expect(drugs.length).toBeGreaterThan(0);
  });

  it('every drug has the 6 canonical fields (name/heb/acb/beers/cat/risk)', () => {
    drugs.forEach((d, i) => {
      expect(typeof d.name, `drugs[${i}].name`).toBe('string');
      expect(d.name.trim().length, `drugs[${i}].name non-empty`).toBeGreaterThan(0);
      expect(typeof d.heb, `drugs[${i}].heb`).toBe('string');
      expect(typeof d.acb, `drugs[${i}].acb`).toBe('number');
      expect(typeof d.beers, `drugs[${i}].beers`).toBe('boolean');
      expect(typeof d.cat, `drugs[${i}].cat`).toBe('string');
      expect(typeof d.risk, `drugs[${i}].risk`).toBe('string');
    });
  });

  it('every drug has acb in {0,1,2,3} (Boustani scale)', () => {
    const bad = drugs.filter((d) => ![0, 1, 2, 3].includes(d.acb));
    expect(bad.map((d) => d.name)).toEqual([]);
  });

  it('risk descriptions are clinically meaningful (>= 10 chars, not just placeholder)', () => {
    const sparse = drugs.filter((d) => d.risk.trim().length < 10);
    expect(sparse.map((d) => d.name)).toEqual([]);
  });

  it('no duplicate drug names (case-insensitive)', () => {
    const seen = new Map();
    const dups = [];
    for (const d of drugs) {
      const key = d.name.toLowerCase();
      if (seen.has(key)) dups.push(d.name);
      else seen.set(key, true);
    }
    expect(dups).toEqual([]);
  });
});

describe('tabs.json — navigation schema', () => {
  let tabs;
  beforeAll(() => {
    tabs = loadData('tabs.json');
  });

  it('is an array of exactly 5 entries', () => {
    expect(Array.isArray(tabs)).toBe(true);
    expect(tabs.length).toBe(5);
  });

  it('every entry has id (string), ic (string emoji), l (string label)', () => {
    tabs.forEach((t, i) => {
      expect(typeof t.id, `tabs[${i}].id`).toBe('string');
      expect(typeof t.ic, `tabs[${i}].ic`).toBe('string');
      expect(typeof t.l, `tabs[${i}].l`).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.ic.length).toBeGreaterThan(0);
      expect(t.l.length).toBeGreaterThan(0);
    });
  });

  it('tab ids are unique', () => {
    const ids = tabs.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('topics.json — keyword schema', () => {
  let topics, questions;
  beforeAll(() => {
    topics = loadData('topics.json');
    questions = loadData('questions.json');
  });

  it('is an array of 24 topics (one per ti)', () => {
    expect(Array.isArray(topics)).toBe(true);
    expect(topics.length).toBe(24);
  });

  it('every topic is a non-empty array of keyword strings', () => {
    topics.forEach((t, i) => {
      expect(Array.isArray(t), `topics[${i}] is array`).toBe(true);
      expect(t.length, `topics[${i}] non-empty`).toBeGreaterThan(0);
      t.forEach((kw, j) => {
        expect(typeof kw, `topics[${i}][${j}] is string`).toBe('string');
        expect(kw.length).toBeGreaterThan(0);
      });
    });
  });

  it('every question.ti points at a defined topic index', () => {
    const oob = questions.filter((q) => q.ti < 0 || q.ti >= topics.length);
    expect(oob.length, `${oob.length} q.ti out of range`).toBe(0);
  });

  test('every legacy topic ti ∈ [0..23] has at least 5 questions', () => {
    const counts = new Map();
    for (const q of questions) counts.set(q.ti, (counts.get(q.ti) || 0) + 1);
    const sparse = [];
    for (let ti = 0; ti < 24; ti++) {
      const n = counts.get(ti) || 0;
      if (n < 5) sparse.push({ ti, n });
    }
    expect(sparse).toEqual([]);
  });
});

describe('Topic distribution balance — quantitative', () => {
  let questions;
  beforeAll(() => {
    questions = loadData('questions.json');
  });

  it('no single topic owns more than 20% of the question bank', () => {
    const counts = new Map();
    for (const q of questions) counts.set(q.ti, (counts.get(q.ti) || 0) + 1);
    const total = questions.length;
    const max = Math.max(...counts.values());
    expect(max / total, `max=${max}/${total}`).toBeLessThanOrEqual(0.2);
  });
});
