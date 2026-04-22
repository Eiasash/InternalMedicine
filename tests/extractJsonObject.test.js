/**
 * Regression test for extractJsonObject() in src/ai/explain.js.
 *
 * The inline regex used to be `/\{[\s\G.S]*\}/` — a state-rename find/replace
 * had turned `\s\S` (any char incl. newlines) into `\s\G.S` (a character class
 * of {whitespace, G, ., S}). That class matches almost nothing in a real JSON
 * payload, so the AI teach-back grader silently fell back to the default score
 * on every successful call. This test locks the repaired contract.
 */

import { describe, it, expect } from 'vitest';
import { extractJsonObject } from '../src/ai/explain.js';

describe('extractJsonObject', () => {
  it('parses a single-line JSON object from plain text', () => {
    const out = extractJsonObject('{"score":3,"feedback":"good"}');
    expect(out).toEqual({ score: 3, feedback: 'good' });
  });

  it('parses JSON that spans multiple lines (pretty-printed)', () => {
    const out = extractJsonObject('{\n  "score": 2,\n  "feedback": "mid"\n}');
    expect(out).toEqual({ score: 2, feedback: 'mid' });
  });

  it('parses JSON wrapped in surrounding prose', () => {
    const txt = 'Here is my grading:\n{"score":1,"mechanism":0,"feedback":"needs work"}\nEnd.';
    expect(extractJsonObject(txt)).toEqual({
      score: 1, mechanism: 0, feedback: 'needs work',
    });
  });

  it('handles Hebrew inside feedback string', () => {
    const txt = '{"score":3,"feedback":"הסבר ברור וממוקד"}';
    expect(extractJsonObject(txt).feedback).toBe('הסבר ברור וממוקד');
  });

  it('returns {} for empty/null/undefined input', () => {
    expect(extractJsonObject('')).toEqual({});
    expect(extractJsonObject(null)).toEqual({});
    expect(extractJsonObject(undefined)).toEqual({});
  });

  it('returns {} when no braces are present', () => {
    expect(extractJsonObject('The score is 3.')).toEqual({});
  });

  it('returns {} for malformed JSON instead of throwing', () => {
    expect(extractJsonObject('{not: valid, json}')).toEqual({});
  });

  it('coerces non-string input without throwing', () => {
    expect(extractJsonObject(42)).toEqual({});
    expect(extractJsonObject({})).toEqual({});
  });

  it('regression: old buggy class [\\s\\G.S] would not have matched this', () => {
    // `"score":3` contains no {whitespace, G, ., S} — under the corrupted
    // regex the match failed and parsed came back as {}.
    const out = extractJsonObject('{"score":3}');
    expect(out.score).toBe(3);
  });
});
