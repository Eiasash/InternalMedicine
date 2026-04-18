/**
 * XSS property tests for `aiAutopsy` in `src/ai/explain.js`.
 *
 * Pipeline:
 *   txt     ← callAI(prompt)
 *   safeTxt ← sanitize(txt)     // escapes < > & " '
 *   out     ← safeTxt with three cosmetic replaces (✗, "Wrong because:",
 *            "Would be correct if:") and \n→<br>.
 *   G._exCache[_apKey] = out
 *
 * The invariant we lock: every `<word` prefix in the final cached HTML
 * must match the allowlist {b, span, br} that the cosmetic replacements
 * produce. `sanitize` has already escaped anything the AI injected, so
 * adversarial `<script>`, `<svg onload=…>`, `<iframe>`, etc. never appear
 * as active tags in the output.
 *
 * Why the first attempt (reverted in #18) failed CI:
 *  - Prior assertions like `not.toMatch(/onload\s*=/i)` triggered on
 *    SANITISED text (`&lt;svg onload=alert(1)&gt;`). `onload=` survives
 *    sanitize because only `<>&"'` get escaped; attribute names as raw
 *    text are harmless, so that assertion was wrong. The allowlist-
 *    based check below is the correct invariant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

// Install BEFORE static imports: explain.js touches localStorage at module
// load time inside a try/catch, and we want a real shim rather than relying
// on the catch to swallow a ReferenceError.
installLocalStorageShim();

vi.mock('../src/ai/client.js', () => ({
  callAI: vi.fn(),
}));

import G from '../src/core/globals.js';
import { aiAutopsy } from '../src/ai/explain.js';
import { callAI } from '../src/ai/client.js';

beforeEach(() => {
  installLocalStorageShim();
  G.S = { sr: {} };
  G.QZ = [{ q: 'Q1', c: 0, o: ['right', 'wrong1', 'wrong2', 'wrong3'] }];
  G._exCache = {};
  G.render = vi.fn();
  callAI.mockReset();
});

function autopsyOutput() {
  return G._exCache['autopsy_0'];
}

const ALLOWED_TAG_PREFIX = /^<(?:b|span|br)\b/;

function assertAllTagsAllowed(out) {
  const tags = out.match(/<\w+/g) || [];
  for (const tag of tags) {
    expect(tag, `unexpected tag ${tag} in output`).toMatch(ALLOWED_TAG_PREFIX);
  }
}

describe('aiAutopsy — specific escape cases', () => {
  it('escapes <script> injections', async () => {
    callAI.mockResolvedValue('<script>alert(1)</script>');
    await aiAutopsy(0);
    const out = autopsyOutput();
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes ampersand to &amp;', async () => {
    callAI.mockResolvedValue('A & B');
    await aiAutopsy(0);
    expect(autopsyOutput()).toContain('A &amp; B');
  });

  it('retains sanctioned decorations: ✗ → <b>, Wrong because: → <span>', async () => {
    callAI.mockResolvedValue('✗ foo — Wrong because: bar.');
    await aiAutopsy(0);
    const out = autopsyOutput();
    expect(out).toContain('<b style="color:#dc2626">✗</b>');
    expect(out).toContain('<span style="color:#b91c1c">Wrong because:</span>');
  });

  it('converts newlines to <br>', async () => {
    callAI.mockResolvedValue('line1\nline2');
    expect((await aiAutopsy(0), autopsyOutput())).toContain('line1<br>line2');
  });
});

describe('aiAutopsy — allowlist invariant for adversarial AI output', () => {
  it('<script> cannot appear as an active tag', async () => {
    callAI.mockResolvedValue('<script>alert(1)</script>');
    await aiAutopsy(0);
    assertAllTagsAllowed(autopsyOutput());
  });

  it('<img onerror> cannot appear as an active tag', async () => {
    callAI.mockResolvedValue("<img src=x onerror='alert(1)'>");
    await aiAutopsy(0);
    assertAllTagsAllowed(autopsyOutput());
  });

  it('<iframe> and <object> cannot appear as active tags', async () => {
    callAI.mockResolvedValue('<iframe src="javascript:alert(1)"></iframe><object data="javascript:alert(1)">');
    await aiAutopsy(0);
    assertAllTagsAllowed(autopsyOutput());
  });

  it('fuzzed cocktail of XSS payloads stays within the allowlist', async () => {
    callAI.mockResolvedValue([
      '<svg onload=alert(1)>',
      '<a href="javascript:alert(1)">x</a>',
      '"><script>a()</script>',
      "'; alert(1); //",
      '<math><mtext><option><foreignObject>',
      '<object data="javascript:alert(1)">',
      '<img src=x onerror=alert(1)>',
    ].join('\n'));
    await aiAutopsy(0);
    assertAllTagsAllowed(autopsyOutput());
  });

  it('errors from callAI produce sanitised fallback markup in allowlist', async () => {
    callAI.mockRejectedValue(new Error('<script>evil</script>'));
    await aiAutopsy(0);
    const out = autopsyOutput();
    assertAllTagsAllowed(out);
    expect(out).toContain('Error:');
    expect(out).not.toContain('<script');
  });
});
