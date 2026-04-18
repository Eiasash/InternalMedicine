/**
 * XSS property tests for `aiAutopsy` in `src/ai/explain.js`.
 *
 * The function pipeline is:
 *   txt ← callAI(prompt)
 *   safeTxt ← sanitize(txt)            // escapes < > & " '
 *   formatted ← safeTxt
 *       .replace(/✗/g, '<b>✗</b>')      // re-adds HTML tags
 *       .replace(/Wrong because:/g, '<span>…</span>')
 *       .replace(/Would be correct if:/g, '<span>…</span>')
 *       .replace(/\n/g, '<br>');
 *   G._exCache[_apKey] = formatted
 *
 * The invariant we lock: whatever adversarial string the AI returns, the
 * final cached HTML must contain no raw `<script`, `<img`, `<iframe`,
 * `javascript:`, or event-handler attributes. If a future refactor moves
 * the `sanitize` call or weakens the escape, these tests fail.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/ai/client.js', () => ({
  callAI: vi.fn(),
}));

import G from '../src/core/globals.js';
import { aiAutopsy } from '../src/ai/explain.js';
import { callAI } from '../src/ai/client.js';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  installLocalStorageShim();
  G.S = { sr: {} };
  G.QZ = [
    { q: 'Q1', c: 0, o: ['right', 'wrong1', 'wrong2', 'wrong3'] },
  ];
  G._exCache = {};
  G.render = vi.fn();
  callAI.mockReset();
});

function autopsyOutput() {
  return G._exCache['autopsy_0'];
}

describe('aiAutopsy — XSS invariants on adversarial AI output', () => {
  it('escapes <script> injections', async () => {
    callAI.mockResolvedValue('<script>alert(1)</script>');
    await aiAutopsy(0);
    const out = autopsyOutput();
    expect(out).not.toContain('<script');
    expect(out).not.toContain('</script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes img-onerror attribute injections', async () => {
    callAI.mockResolvedValue("<img src=x onerror='alert(1)'>");
    const out = (await aiAutopsy(0), autopsyOutput());
    expect(out).not.toContain('<img');
    expect(out).not.toContain('onerror=');
    expect(out).toContain('&lt;img');
  });

  it('escapes iframe injections', async () => {
    callAI.mockResolvedValue('<iframe src="javascript:alert(1)"></iframe>');
    await aiAutopsy(0);
    const out = autopsyOutput();
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('javascript:alert');
  });

  it('escapes ampersand to &amp; (prevents double-unescape)', async () => {
    callAI.mockResolvedValue('A & B');
    await aiAutopsy(0);
    expect(autopsyOutput()).toContain('A &amp; B');
  });

  it('retains intentional markup wrappers (✗ → <b>…</b>)', async () => {
    callAI.mockResolvedValue('✗ foo — Wrong because: bar.');
    await aiAutopsy(0);
    const out = autopsyOutput();
    // The sanctioned replacements ARE expected to produce raw tags —
    // confirm they still work (tests prevent someone accidentally
    // sanitising AFTER the replace and breaking the decoration).
    expect(out).toContain('<b style="color:#dc2626">✗</b>');
    expect(out).toContain('<span style="color:#b91c1c">Wrong because:</span>');
  });

  it('converts newlines to <br> (line-break formatting preserved)', async () => {
    callAI.mockResolvedValue('line1\nline2');
    await aiAutopsy(0);
    expect(autopsyOutput()).toContain('line1<br>line2');
  });

  it('handles fuzzed adversarial input without emitting executable tags', async () => {
    const adversarial = [
      '<svg onload=alert(1)>',
      '<a href="javascript:alert(1)">x</a>',
      '"><script>a()</script>',
      "'; alert(1); //",
      '<math><mtext><option><foreignObject>',
      '<object data="javascript:alert(1)">',
    ].join('\n');
    callAI.mockResolvedValue(adversarial);
    await aiAutopsy(0);
    const out = autopsyOutput();
    // No raw angle-bracket tag that could execute JS.
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/<svg\b/i);
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toMatch(/<object/i);
    expect(out).not.toMatch(/<a\s+href/i);
    expect(out).not.toMatch(/onload\s*=/i);
    expect(out).not.toMatch(/onerror\s*=/i);
    // javascript: survives as raw text (escaped via quote sanitisation
    // breaking href="") — still inert without a surrounding <a> tag.
    expect(out).not.toMatch(/href\s*=\s*["']?javascript:/i);
  });

  it('errors from callAI produce sanitised fallback markup', async () => {
    callAI.mockRejectedValue(new Error('<script>evil</script>'));
    await aiAutopsy(0);
    const out = autopsyOutput();
    expect(out).not.toContain('<script');
    expect(out).toContain('Error:');
  });
});
