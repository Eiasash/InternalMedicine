/**
 * Tests for src/ui/source-link.js — resolveSource precedence + render output.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

globalThis.window = globalThis;

let G, resolveSource, renderSourceLink, openSourceForQuestion;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/source-link.js');
  resolveSource = mod.resolveSource;
  renderSourceLink = mod.renderSourceLink;
  openSourceForQuestion = mod.openSourceForQuestion;
});

beforeEach(() => {
  G.QZ = [
    { ti: 0 }, // Cardiology — Coronary → TOPIC_REF[0] = ch 285
    { ti: 14 }, // Neurology & Stroke → ch 437
    { ti: -1 }, // No topic
    { ti: 0, ref: { s: 'har', ch: 999, l: 'Override Ch 999' } }, // explicit override
  ];
});

describe('resolveSource', () => {
  it('returns null for unknown / negative topic', () => {
    expect(resolveSource(null)).toBeNull();
    expect(resolveSource({ ti: -1 })).toBeNull();
  });
  it('falls back to TOPIC_REF[ti] for known topics', () => {
    const s = resolveSource(G.QZ[0]);
    expect(s).toBeTruthy();
    expect(s.ch).toBe(285);
    expect(s.kind).toBe('har');
    expect(s.label).toMatch(/Harrison/);
  });
  it('honours per-question ref override', () => {
    const s = resolveSource(G.QZ[3]);
    expect(s.ch).toBe(999);
    expect(s.label).toBe('Override Ch 999');
  });
});

describe('renderSourceLink', () => {
  it('emits a clickable anchor with data-action and data-idx', () => {
    const html = renderSourceLink(0);
    expect(html).toContain('data-action="open-source-link"');
    expect(html).toContain('data-idx="0"');
    expect(html).toContain('Harrison');
    expect(html).toContain('aria-label');
  });
  it('returns empty string when no source can be resolved', () => {
    expect(renderSourceLink(2)).toBe('');
    expect(renderSourceLink(99)).toBe('');
  });
  it('escapes HTML in labels (defense in depth)', () => {
    G.QZ[0] = { ti: 0, ref: { s: 'har', ch: 1, l: '<script>x</script>' } };
    const html = renderSourceLink(0);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('openSourceForQuestion', () => {
  it('switches to library tab and calls window.openHarrisonChapter', () => {
    let called = null;
    window.openHarrisonChapter = (ch) => { called = ch; };
    G.tab = 'quiz';
    G.libSec = 'articles';
    openSourceForQuestion(0);
    expect(G.tab).toBe('lib');
    expect(G.libSec).toBe('harrison');
    expect(called).toBe(285);
    delete window.openHarrisonChapter;
  });
  it('no-ops when source cannot be resolved', () => {
    let called = null;
    window.openHarrisonChapter = (ch) => { called = ch; };
    openSourceForQuestion(2); // ti = -1
    expect(called).toBeNull();
    delete window.openHarrisonChapter;
  });
});
