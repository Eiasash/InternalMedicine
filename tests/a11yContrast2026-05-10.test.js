/**
 * Accessibility regression guards for IM v10.4.21 contrast port from
 * Geri v10.64.82-87 + FM v1.21.20-21 a11y campaigns.
 *
 * Live playwright re-audit on v10.4.20 found 26 contrast violations
 * (gradient-blindspot dm-btn false positives excluded). Each test below
 * pins one of the 10 fixes shipped in v10.4.21.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let html = '';
let utilitiesCss = '';
let layoutCss = '';
let quizViewJs = '';

beforeAll(() => {
  const root = resolve(import.meta.dirname, '..');
  html = readFileSync(resolve(root, 'pnimit-mega.html'), 'utf-8');
  utilitiesCss = readFileSync(resolve(root, 'src/styles/utilities.css'), 'utf-8');
  layoutCss = readFileSync(resolve(root, 'src/styles/layout.css'), 'utf-8');
  quizViewJs = readFileSync(resolve(root, 'src/ui/quiz-view.js'), 'utf-8');
});

describe('a11y v10.4.21 — html dir + headerVer', () => {
  it('document root has explicit dir="rtl"', () => {
    expect(html).toMatch(/<html[^>]*lang="he"[^>]*dir="rtl"/);
  });

  it('#headerVer span uses slate-300 (#cbd5e1) for dark gradient bg, not slate-600 (#475569)', () => {
    const m = html.match(/<span id="headerVer"[^>]*>/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('color:#cbd5e1');
    expect(m[0]).not.toContain('color:#475569');
  });
});

describe('a11y v10.4.21 — utilities.css', () => {
  it('skip-link bg is teal #0a5d54 (7.76:1 AAA), not light sky #3b82f6 (3.68:1)', () => {
    const m = utilitiesCss.match(/\.skip-link\s*\{[^}]+\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('background: #0a5d54');
    expect(m[0]).not.toContain('background: #3b82f6');
  });

  it('.tt-icon uses slate-300 bg + slate-700 fg (5.65:1 AA), not slate-200 + slate-500 (3.77:1)', () => {
    const m = utilitiesCss.match(/\.tt-icon\s*\{[^}]+\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('background: #cbd5e1');
    expect(m[0]).toContain('color: #475569');
    expect(m[0]).not.toContain('background: #e2e8f0');
  });
});

describe('a11y v10.4.21 — layout.css (.hdr p + tabs)', () => {
  it('.hdr p uses slate-300 (#cbd5e1) on dark gradient, not slate-500 (#64748b)', () => {
    expect(layoutCss).toMatch(/\.hdr p \{[^}]*color: #cbd5e1/);
    expect(layoutCss).not.toMatch(/\.hdr p \{[^}]*color: #64748b/);
  });

  it('.tabs button:not(.on) uses slate-500 (#64748b, 4.65:1 AA), not slate-400 (#94a3b8)', () => {
    expect(layoutCss).toMatch(/\.tabs button:not\(\.on\) \{[^}]*color: #64748b/);
    expect(layoutCss).not.toMatch(/\.tabs button:not\(\.on\) \{[^}]*color: #94a3b8/);
  });
});

describe('a11y v10.4.21 — JS render inline-style fixes', () => {
  it('quiz counter span uses slate-500 inline (was slate-400)', () => {
    // Line ~333: <span style="color:#64748b;font-size:10px">${G.qi+1}/${G.pool.length}</span>
    expect(quizViewJs).toMatch(/<span style="color:#64748b;font-size:10px">\$\{G\.qi\+1\}\/\$\{G\.pool\.length\}<\/span>/);
    expect(quizViewJs).not.toMatch(/<span style="color:#94a3b8;font-size:10px">\$\{G\.qi\+1\}\/\$\{G\.pool\.length\}/);
  });

  it('stats wrapper uses slate-500 inline (✅ qOk / ❌ qNo / 📊 pct row)', () => {
    // Line ~501: <div style="...color:#64748b">
    expect(quizViewJs).toMatch(/border-top:1px solid #f1f5f9;font-size:10px;color:#64748b">[^]*?<span>✅/);
    expect(quizViewJs).not.toMatch(/border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8">/);
  });

  it('"👁 לא יודע" give-up button uses amber-800 (#92400e, 6.89:1 AAA), not amber-600', () => {
    // Line ~351 give-up button
    expect(quizViewJs).toMatch(/data-action="give-up"[^>]*background:#fff3e0;color:#92400e/);
    expect(quizViewJs).not.toMatch(/data-action="give-up"[^>]*background:#fff3e0;color:#d97706/);
  });

  it('keeps retired mode launch buttons out of the visible quiz controls', () => {
    expect(quizViewJs).not.toMatch(/data-action="start-sd"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-oncall"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-pomo"[^>]*>/);
  });
});

describe('a11y v10.4.22 — residual contrast clears', () => {
  let componentsCss = '';
  beforeAll(() => {
    componentsCss = readFileSync(resolve(import.meta.dirname, '../src/styles/components.css'), 'utf-8');
  });

  it('✎ note button unset-state uses slate-600 (#475569, 6.04:1), not slate-500 (#64748b, 4.34:1)', () => {
    // Both ✎ note and ☆ bookmark share the same inline ternary pattern
    expect(quizViewJs).toMatch(/color:\$\{[^}]*qnotes[^}]*\?'#92400e':'#475569'\}/);
    expect(quizViewJs).not.toMatch(/color:\$\{[^}]*qnotes[^}]*\?'#92400e':'#64748b'\}/);
  });

  it('pnimit-skin .tabs button.on scoped override uses dark teal (#0a5d54, 7.76:1 AAA)', () => {
    expect(layoutCss).toMatch(/html\[data-skin="pnimit"\]\s+\.tabs button\.on\s*\{\s*color:\s*#0a5d54\s*\}/);
    expect(layoutCss).toMatch(/body\.dark\[data-skin="pnimit"\]\s+\.tabs button\.on[^{]*\{\s*color:\s*var\(--app-primary\)\s*\}/);
  });

  it('pnimit-skin .pill.on scoped override uses dark teal background (#0a5d54, 7.76:1 with white)', () => {
    expect(componentsCss).toMatch(/html\[data-skin="pnimit"\]\s+\.pill\.on\s*\{\s*background:\s*#0a5d54\s*\}/);
    expect(componentsCss).toMatch(/body\.dark\[data-skin="pnimit"\]\s+\.pill\.on[^{]*\{\s*background:\s*var\(--app-primary\)\s*\}/);
  });

  it('base .pill.on rule is unchanged (still uses --app-primary for non-pnimit skins)', () => {
    expect(componentsCss).toMatch(/^\.pill\.on\s*\{\s*background:\s*var\(--app-primary\)/m);
  });
});

describe('a11y v10.4.23 — skip-link mobile out-of-bounds guard', () => {
  // Browser-tested 2026-05-10 against the FM/Geri sibling: legacy
  // `.skip-link { left:-9999px }` inflated documentElement.scrollWidth to
  // 10385px on 390-wide mobile viewports. Body had overflow-x:hidden but
  // <html> had overflow-x:visible, so the phantom width affected Lighthouse,
  // pinch-zoom math, and JS reading scrollWidth. Fix replaces off-screen
  // pattern with WCAG canonical clip-rect visually-hidden pattern. These
  // guards prevent drive-by reintroduction. Sibling-aligned with Geri
  // tests/a11yIssue125.test.js + FM tests/a11yContrast2026-05-10.test.js.

  it('.skip-link rule does NOT use left:-9999 (or other large negative)', () => {
    const m = utilitiesCss.match(/\.skip-link\s*\{[^}]+\}/);
    expect(m, '.skip-link CSS rule must exist').not.toBeNull();
    expect(m[0]).not.toMatch(/left:\s*-\d{3,}/);
  });

  it('.skip-link rule uses the visually-hidden clip pattern', () => {
    const m = utilitiesCss.match(/\.skip-link\s*\{[^}]+\}/);
    expect(m).not.toBeNull();
    expect(m[0]).toMatch(/clip:\s*rect\(\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*\)/);
  });

  it('.skip-link:focus restores width/height for visible focus state', () => {
    const m = utilitiesCss.match(/\.skip-link:focus\s*\{[^}]+\}/);
    expect(m, '.skip-link:focus rule must exist').not.toBeNull();
    expect(m[0]).toMatch(/width:\s*auto/);
    expect(m[0]).toMatch(/height:\s*auto/);
    expect(m[0]).toMatch(/clip:\s*auto/);
  });
});
