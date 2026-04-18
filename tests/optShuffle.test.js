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

  it('flags אף תשובה', () => {
    expect(isMetaOption('אף תשובה אינה נכונה')).toBe(true);
  });

  it('flags English "all/none of the above"', () => {
    expect(isMetaOption('All of the above')).toBe(true);
    expect(isMetaOption('none of THE above')).toBe(true);
  });

  it('flags English compound "A and C" form', () => {
    expect(isMetaOption('A and C')).toBe(true);
  });

  it('flags digit compound reference (1 ו 2)', () => {
    expect(isMetaOption('1 ו 2')).toBe(true);
  });

  it('does NOT flag normal medical options', () => {
    expect(isMetaOption('Myocardial infarction')).toBe(false);
    expect(isMetaOption('80 mg/dL')).toBe(false);
    expect(isMetaOption('')).toBe(false);
  });
});

describe('remapExplanationLetters', () => {
  it('rewrites English A/B/C/D/E to display positions', () => {
    const shuf = [2, 0, 1, 3];
    expect(remapExplanationLetters('answer A is correct', shuf)).toBe('answer B is correct');
    expect(remapExplanationLetters('see option C', shuf)).toBe('see option A');
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

  it('different qIdx rebuilds the cache', () => {
    const q = { o: ['a', 'b', 'c', 'd'] };
    const map5 = getOptShuffle(5, q).slice();
    getOptShuffle(7, q);
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
    const q = { o: ['real A', 'real B', 'כל התשובות נכונות', 'real D'] };
    const map = getOptShuffle(9, q);
    expect(map[map.length - 1]).toBe(2);
  });

  it('pins multiple meta-options to the end in their original order', () => {
    const q = { o: ['real A', 'All of the above', 'real C', 'None of the above'] };
    const map = getOptShuffle(11, q);
    expect(map.slice(-2)).toEqual([1, 3]);
  });
});
