// Sibling-aligned with FamilyMedicine/tests/chaosBotV4ExtractJson.test.js.
// Pins the v4 bot's brace-balanced JSON extractor contract — replaces
// the v3 regex /\{[^{}]*\}/ that rejected nested objects and choked on
// multi-line markdown-fenced model output.
import { describe, it, expect } from 'vitest';
import { extractJson } from '../scripts/lib/extractJson.mjs';

describe('chaos-doctor-bot v4 extractJson', () => {
  it('parses a clean single-line JSON', () => {
    expect(extractJson('{"pick":"A","confidence":92,"why":"x"}')).toEqual({ pick: 'A', confidence: 92, why: 'x' });
  });
  it('strips ```json fences', () => {
    expect(extractJson('```json\n{"pick":"B","confidence":80,"why":"y"}\n```')).toEqual({ pick: 'B', confidence: 80, why: 'y' });
  });
  it('strips bare ``` fences', () => {
    expect(extractJson('```\n{"app_answer_correct":true,"explanation_sound":true,"confidence":95,"issue":null}\n```')).toEqual({ app_answer_correct: true, explanation_sound: true, confidence: 95, issue: null });
  });
  it('handles trailing prose after the JSON', () => {
    expect(extractJson('{"pick":"C","confidence":70,"why":"z"} Hope this helps!')).toEqual({ pick: 'C', confidence: 70, why: 'z' });
  });
  it('handles nested objects (the v3 regex blocker)', () => {
    expect(extractJson('{"judge":{"answer":"A","conf":80},"source":{"plausible":true}}')).toEqual({ judge: { answer: 'A', conf: 80 }, source: { plausible: true } });
  });
  it('handles multi-line JSON (the v3 regex blocker)', () => {
    const text = `{
  "pick": "D",
  "confidence": 88,
  "why": "long reasoning that spans multiple lines"
}`;
    expect(extractJson(text)).toEqual({ pick: 'D', confidence: 88, why: 'long reasoning that spans multiple lines' });
  });
  it('handles braces inside strings without breaking depth tracking', () => {
    expect(extractJson('{"why":"options were { a, b, c } at start","pick":"A"}')).toEqual({ why: 'options were { a, b, c } at start', pick: 'A' });
  });
  it('handles escaped quotes inside strings', () => {
    expect(extractJson('{"why":"she said \\"hi\\" to me","pick":"B"}')).toEqual({ why: 'she said "hi" to me', pick: 'B' });
  });
  it('returns null for empty / malformed input', () => {
    expect(extractJson('')).toBeNull();
    expect(extractJson(null)).toBeNull();
    expect(extractJson('not json at all')).toBeNull();
    expect(extractJson('{')).toBeNull();
  });
  it('parses leading-prose then JSON', () => {
    expect(extractJson('Here is my answer:\n{"pick":"A","confidence":50,"why":"hedge"}')).toEqual({ pick: 'A', confidence: 50, why: 'hedge' });
  });
});
