/**
 * Tests for filterRestorePayload() in src/features/cloud.js.
 *
 * cloudRestore() hydrates G.S from a Supabase row. The previous inline
 * whitelist `new Set(Object.keys(G.S))` was fine but untested — one
 * sloppy edit could turn it into `Object.keys(row.data)` and accept
 * attacker-controlled keys (shared device ID, row tampering).
 *
 * Extracted as a pure function so the whitelist contract is locked.
 * Analysis doc §3.7.
 */

import { describe, it, expect, vi } from 'vitest';

// cloud.js transitively imports track-view.js → spaced-repetition.js →
// fsrs-bridge.js which references `window`. Stub the offending boundaries
// so node env can import filterRestorePayload in isolation.
vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({})),
  getDueQuestions: vi.fn(() => []),
}));

import { filterRestorePayload } from '../src/features/cloud.js';

describe('filterRestorePayload — whitelist', () => {
  it('keeps only keys present in the allowed set', () => {
    const allowed = new Set(['qOk', 'qNo', 'sr']);
    const payload = { qOk: 5, qNo: 2, sr: { x: 1 }, rogue: 'evil', extra: 42 };
    expect(filterRestorePayload(payload, allowed)).toEqual({
      qOk: 5, qNo: 2, sr: { x: 1 },
    });
  });

  it('accepts an array of allowed keys (not just a Set)', () => {
    const payload = { a: 1, b: 2, c: 3 };
    expect(filterRestorePayload(payload, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('returns empty object when no keys overlap', () => {
    expect(filterRestorePayload({ foo: 1 }, new Set(['bar']))).toEqual({});
  });

  it('returns empty object for null / undefined payload', () => {
    expect(filterRestorePayload(null, new Set(['a']))).toEqual({});
    expect(filterRestorePayload(undefined, new Set(['a']))).toEqual({});
  });

  it('returns empty object for array payload (not a state object)', () => {
    expect(filterRestorePayload([1, 2, 3], new Set(['0', '1']))).toEqual({});
  });

  it('returns empty object for primitive payload', () => {
    expect(filterRestorePayload('malicious', new Set(['a']))).toEqual({});
    expect(filterRestorePayload(42, new Set(['a']))).toEqual({});
  });

  it('preserves falsy but valid values', () => {
    const allowed = new Set(['a', 'b', 'c', 'd']);
    const payload = { a: 0, b: '', c: false, d: null };
    expect(filterRestorePayload(payload, allowed)).toEqual({
      a: 0, b: '', c: false, d: null,
    });
  });
});

describe('filterRestorePayload — prototype pollution blockers', () => {
  it('blocks __proto__', () => {
    const allowed = new Set(['__proto__', 'a']);
    const payload = JSON.parse('{"__proto__":{"polluted":true},"a":1}');
    const out = filterRestorePayload(payload, allowed);
    expect(out).toEqual({ a: 1 });
    expect({}.polluted).toBeUndefined();
  });

  it('blocks constructor', () => {
    const allowed = new Set(['constructor', 'a']);
    const payload = { constructor: { prototype: { hacked: 1 } }, a: 1 };
    expect(filterRestorePayload(payload, allowed)).toEqual({ a: 1 });
  });

  it('blocks prototype', () => {
    const allowed = new Set(['prototype', 'a']);
    const payload = { prototype: { hacked: 1 }, a: 1 };
    expect(filterRestorePayload(payload, allowed)).toEqual({ a: 1 });
  });
});

describe('filterRestorePayload — inherited keys', () => {
  it('ignores keys from payload\'s prototype chain (Object.keys already does, but verify)', () => {
    const proto = { inherited: 'bad' };
    const payload = Object.create(proto);
    payload.own = 'good';
    const out = filterRestorePayload(payload, new Set(['inherited', 'own']));
    expect(out).toEqual({ own: 'good' });
    expect('inherited' in out).toBe(false);
  });
});

describe('filterRestorePayload — real-world restore shapes', () => {
  it('restores the canonical G.S keys end-to-end', () => {
    // Mirrors the shape from state.js defaults.
    const currentState = {
      ck: {}, qOk: 0, qNo: 0, bk: {}, notes: {}, sr: {},
      fci: 0, fcFlip: false, streak: 0, lastDay: null,
      chat: [], studyMode: false, sp: {}, spOpen: true,
    };
    const backup = {
      qOk: 123, qNo: 45, sr: { q1: { ef: 2.5 } }, streak: 7,
      lastDay: '2026-04-17', chat: [{ role: 'user', content: 'hi' }],
      // Keys that must NOT leak in from a tampered row:
      _admin: true,
      __proto__: { polluted: true },
      apikey: 'stolen-key',
      uid: 'other-user',
    };
    const validated = filterRestorePayload(backup, new Set(Object.keys(currentState)));
    expect(validated.qOk).toBe(123);
    expect(validated.qNo).toBe(45);
    expect(validated.streak).toBe(7);
    expect(validated.chat).toHaveLength(1);
    // Blocked (use hasOwn — `__proto__` is always `in` via prototype chain):
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    expect(has(validated, '_admin')).toBe(false);
    expect(has(validated, '__proto__')).toBe(false);
    expect(has(validated, 'apikey')).toBe(false);
    expect(has(validated, 'uid')).toBe(false);
    // And confirm prototype wasn't polluted as a side effect.
    expect({}.polluted).toBeUndefined();
  });
});
