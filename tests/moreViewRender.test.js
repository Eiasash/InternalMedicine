/**
 * UI integration test scaffolding — first targeted view-render test for
 * the IM monolith. Targets `more-view.js`'s `renderNotes()` which was at
 * 0% coverage in the v10.4.13 baseline (per IMPROVEMENTS.md R2).
 *
 * Why this is "integration" not "unit": exercises the full render path
 * through G.S state + G.QZ corpus + sanitize() escape behavior + the
 * empty-state vs populated-state branches. Catches regressions like
 * v10.4.x's "qOk+qNo gating" class — render functions that misread
 * shared state.
 *
 * Pattern: mock G + heavy transitive imports, call renderNotes() with
 * controlled state, assert HTML string shape. No DOM needed because
 * the render returns a string. Mirrors cloudFeatures.test.js shim style.
 *
 * If this scaffolding holds, future renderXxx tests are cheap copies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoist mocks to top-level — vitest 4+ rejects nested vi.mock().
// more-view.js transitively imports modes (which uses navigator) + cloud
// (which uses fetch) + ai/client. None are needed for the pure render path.
vi.mock('../src/quiz/modes.js', () => ({ startVoiceParser: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/features/cloud.js', () => ({ submitFeedbackForm: vi.fn() }));
vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));

import G from '../src/core/globals.js';
import { renderNotes } from '../src/ui/more-view.js';

beforeEach(() => {
  G.S = { qnotes: {}, gnotes: '' };
  G.QZ = [
    { q: 'Short question?', o: ['a', 'b', 'c', 'd'], c: 0 },
    { q: 'A much longer question stem that exceeds eighty characters in total length, designed to trigger the truncation path with the ellipsis at the end of the preview', o: ['a', 'b'], c: 1 },
  ];
});

describe('renderNotes — empty state', () => {
  it('shows the empty-notes prompt when qnotes is empty', () => {
    const html = renderNotes();
    expect(html).toContain('אין הערות');
    expect(html).toContain('🔖 הערות על שאלות (0)');
  });

  it('renders the gnotes textarea with empty value', () => {
    const html = renderNotes();
    expect(html).toContain('id="gnotes-ta"');
    expect(html).toMatch(/<textarea[^>]*>(\s*)<\/textarea>/);
  });

  it('always emits the section header + save/export controls', () => {
    const html = renderNotes();
    expect(html).toContain('📝 Notes');
    expect(html).toContain('data-action="save-gnotes"');
    expect(html).toContain('data-action="export-gnotes"');
    expect(html).toContain('id="gnotes-status"');
  });
});

describe('renderNotes — populated state', () => {
  it('shows entry count + lists each note', () => {
    G.S.qnotes = { 0: 'note about Q0', 1: 'note about Q1' };
    const html = renderNotes();
    expect(html).toContain('🔖 הערות על שאלות (2)');
    expect(html).toContain('note about Q0');
    expect(html).toContain('note about Q1');
    expect(html).not.toContain('אין הערות');
  });

  it('truncates question previews longer than 80 chars with ellipsis', () => {
    G.S.qnotes = { 1: 'note on the long question' };
    const html = renderNotes();
    // Ellipsis appears for q.q.length > 80
    expect(html).toContain('…');
    // Truncated preview should be 80 chars from the long question
    expect(html).toContain('A much longer question stem that exceeds eighty characters in total length');
  });

  it('does NOT truncate questions ≤80 chars', () => {
    G.S.qnotes = { 0: 'note on short q' };
    const html = renderNotes();
    expect(html).toContain('Short question?');
    // The ellipsis is conditional on q.length>80; the ONLY note here is on
    // a 16-char Q so no ellipsis should appear in any preview block
    const previewBlock = html.split('🔖 הערות על שאלות')[1];
    expect(previewBlock).not.toContain('…');
  });

  it('emits per-entry jump + delete buttons with correct data-idx', () => {
    G.S.qnotes = { 0: 'a', 1: 'b' };
    const html = renderNotes();
    expect(html).toContain('data-action="jump-to-q" data-idx="0"');
    expect(html).toContain('data-action="jump-to-q" data-idx="1"');
    expect(html).toContain('data-action="del-qnote-idx" data-idx="0"');
    expect(html).toContain('data-action="del-qnote-idx" data-idx="1"');
  });

  it('skips entries whose question index no longer exists in G.QZ', () => {
    // q.idx=99 has no corresponding QZ entry — must not crash, must skip.
    // Per more-view.js:27 (`const q=G.QZ[idx];if(!q)return;`) the orphan
    // entry is filtered out at render time — its note text does NOT render.
    G.S.qnotes = { 0: 'valid', 99: 'orphan' };
    expect(() => renderNotes()).not.toThrow();
    const html = renderNotes();
    expect(html).toContain('valid');
    // Header counts both entries because the filter happens AFTER the
    // empty-trim filter but at render time per-row, not at count time.
    expect(html).toContain('🔖 הערות על שאלות (2)');
    // Orphan note text is suppressed because its q lookup failed.
    expect(html).not.toContain('orphan');
  });

  it('skips empty/whitespace-only notes per Object.entries filter', () => {
    G.S.qnotes = { 0: 'real note', 1: '', 2: '   ' };
    const html = renderNotes();
    expect(html).toContain('🔖 הערות על שאלות (1)'); // only 1 valid entry
    expect(html).toContain('real note');
  });
});

describe('renderNotes — sanitization (XSS guard)', () => {
  it('escapes <script> in note text', () => {
    G.S.qnotes = { 0: '<script>alert(1)</script>' };
    const html = renderNotes();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes <img onerror> in note text', () => {
    G.S.qnotes = { 0: '<img src=x onerror=alert(1)>' };
    const html = renderNotes();
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('escapes the gnotes textarea content', () => {
    G.S.gnotes = '<script>nope</script>';
    const html = renderNotes();
    expect(html).not.toContain('<script>nope</script>');
    expect(html).toContain('&lt;script&gt;nope&lt;/script&gt;');
  });

  it('escapes question stems pulled from G.QZ', () => {
    G.QZ[0] = { q: '<b>nasty</b> stem', o: [], c: 0 };
    G.S.qnotes = { 0: 'note' };
    const html = renderNotes();
    expect(html).not.toContain('<b>nasty</b> stem');
    expect(html).toContain('&lt;b&gt;nasty&lt;/b&gt;');
  });
});

describe('renderNotes — gnotes textarea content', () => {
  it('reflects G.S.gnotes string value', () => {
    G.S.gnotes = 'my session notes';
    const html = renderNotes();
    expect(html).toContain('>my session notes</textarea>');
  });

  it('handles missing gnotes gracefully (empty string default)', () => {
    delete G.S.gnotes;
    expect(() => renderNotes()).not.toThrow();
    const html = renderNotes();
    expect(html).toMatch(/<textarea[^>]*>(\s*)<\/textarea>/);
  });

  it('handles missing qnotes gracefully (empty {} default)', () => {
    delete G.S.qnotes;
    expect(() => renderNotes()).not.toThrow();
    const html = renderNotes();
    expect(html).toContain('🔖 הערות על שאלות (0)');
  });
});
