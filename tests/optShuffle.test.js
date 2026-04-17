/**
 * Tests for src/core/utils.js option-shuffle utilities.
 *
 * These functions are exam-integrity critical: if the seed drifts or
 * meta-options ("A and C", "כל התשובות נכונות") get shuffled, the
 * answer key breaks. Prior to this file, only `sanitize` from utils.js
 * was covered by any test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isMetaOption, remapExplanationLetters, getOptShuffle } from '../src/core/utils.js';
import G from '../src/core/globals.js';

describe('isMetaOption', () => {
  it('flags כל התשובות נכונות', () => {
    expect(isMetaOption('כל התשובות נכונות')).toBe(true);
    expect(isMetaOption('כל האמור נכון')).toBe(true);
  });

  it('flags אף תשובה אינה נכונה', () => {
    expect(isMetaOption('אף תשובה אינה נכונה')).toBe(true);
  });

  it('flags English "all/none of the above"', () => {
    expect(isMetaOption('All of the above')).toBe(true);
    expect(isMetaOption('none of THE above')).toBe(true);
  });

  it('flags compound references ("A and C", "1 ו-2")', () => {
    expect(isMetaOption('A and C')).toBe(true);
    expect(isMetaOption('1 ו-2')).toBe(true);
    expect(isMetaOption("א׳ ו-ג׳")).toBe(true);
  });

  it('does NOT flag normal medical options', () => {
    expect(isMetaOption('Myocardial infarction')).toBe(false);
    expect(isMetaOption('איסכמיה מוקדית')).toBe(false);
    expect(isMetaOption('80 mg/dL')).toBe(false);
    expect(isMetaOption('')).toBe(false);
  });
});

describe('remapExplanationLetters', () => {
  it('rewrites English A/B/C/D/E to display positions', () => {
    // shuf[display] = original; so display 0 shows original index 2
    const shuf = [2, 0, 1, 3];
    // In explanation, "A" refers to original index 0. After shuffle,
    // original 0 now appears at display 1 → should become "B".
    expect(remapExplanationLetters('answer A is correct', shuf)).toBe('answer B is correct');
    expect(remapExplanationLetters('see option C', shuf)).toBe('see option A');
  });

  it('rewrites Hebrew א/ב/ג/ד/ה with "תשובה" prefix', () => {
    const shuf = [2, 0, 1, 3];
    expect(remapExplanationLetters('תשובה א נכונה', shuf)).toBe('תשובה ב נכונה');
    expect(remapExplanationLetters('תשובה  ג', shuf)).toBe('תשובה  א');
  });

  it('leaves unrelated text untouched', () => {
    const shuf = [0, 1, 2, 3];
    expect(remapExplanationLetters('no letters to remap', shuf)).toBe('no letters to remap');
  });

  it('identity shuffle is a no-op', () => {
    const shuf = [0, 1, 2, 3, 4];
    expect(remapExplanationLetters('answer A, option D', shuf)).toBe('answer A, option D');
  });
});

describe('getOptShuffle', () => {
  beforeEach(() => {
    G._optShuffle = null;
  });

  it('returns the same shuffle for the same qIdx (deterministic cache)', () => {
    const q = { o: ['a', 'b', 'c', 'd'] };
    const map1 = getOptShuffle(5, q);
    const map2 = getOptShuffle(5, q);
    expect(map2).toBe(map1);
  });

  it('caches per qIdx; different qIdx clears the cache', () => {
    const q = { o: ['a', 'b', 'c', 'd'] };
    const map5 = getOptShuffle(5, q).slice();
    const map7 = getOptShuffle(7, q);
    // cache now keyed on 7; calling with 5 again builds a fresh one
    const map5b = getOptShuffle(5, q);
    expect(map5).toEqual(map5b);
    expect(G._optShuffle.qIdx).toBe(5);
  });

  it('produces a valid permutation of [0..n-1]', () => {
    const q = { o: ['a', 'b', 'c', 'd'] };
    const map = getOptShuffle(42, q);
    expect(map.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('pins meta-options to the end', () => {
    // Index 2 is a meta-option — must end up at the last display position.
    const q = { o: ['real A', 'real B', 'כל התשובות נכונות', 'real D'] };
    const map = getOptShuffle(9, q);
    expect(map[map.length - 1]).toBe(2);
  });

  it('pins multiple meta-options to the end in their original order', () => {
    const q = { o: ['real A', 'All of the above', 'real C', 'None of the above'] };
    const map = getOptShuffle(11, q);
    // Both meta options must be at the tail; "All" (idx 1) comes before "None" (idx 3)
    expect(map.slice(-2)).toEqual([1, 3]);
  });

  it('is a no-op-shape when all options are meta (still returns valid permutation)', () => {
    const q = { o: ['כל התשובות נכונות', 'אף תשובה נכונה'] };
    const map = getOptShuffle(13, q);
    expect(map.slice().sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('different qIdx generally produces different shuffles', () => {
    const q = { o: ['a', 'b', 'c', 'd', 'e', 'f'] };
    const maps = new Set();
    for (let i = 0; i < 20; i++) {
      G._optShuffle = null;
      maps.add(JSON.stringify(getOptShuffle(i, q)));
    }
    // Seeded LCG — expect at least several distinct orderings across 20 qIdx
    expect(maps.size).toBeGreaterThan(3);
  });
});
