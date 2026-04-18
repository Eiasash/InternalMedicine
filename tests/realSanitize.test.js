/**
 * Tests the REAL `sanitize` export from `src/core/utils.js`.
 *
 * `tests/appLogic.test.js` tests a COPY of sanitize redeclared inline.
 * If the real module diverges, the copy tests still pass but the app
 * regresses. This file locks the real source against the same invariants.
 */

import { describe, it, expect } from 'vitest';
import { sanitize } from '../src/core/utils.js';

describe('src/core/utils.js — sanitize (real module)', () => {
  it('escapes < and > for script injection', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersand before other entities (no double-encoding)', () => {
    expect(sanitize('A & B')).toBe('A &amp; B');
    expect(sanitize('&lt;')).toBe('&amp;lt;');
  });

  it('escapes single quote to &#39;', () => {
    expect(sanitize("it's")).toBe('it&#39;s');
  });

  it('escapes double quote to &quot;', () => {
    expect(sanitize('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('handles null, undefined, and empty string', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
    expect(sanitize('')).toBe('');
  });

  it('stringifies numbers without crashing', () => {
    expect(sanitize(42)).toBe('42');
  });

  it('neutralises event-handler injection attempt', () => {
    const out = sanitize(`<img src=x onerror='alert(1)'>`);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain("'");
    expect(out).toContain('&lt;img');
    expect(out).toContain('&#39;');
  });
});
