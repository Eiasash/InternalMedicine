import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression guard for the v10.4.37 dark-mode P1 fix (2026-05-31 suite-wide audit).
// Inverse dark-on-dark bug: reader prose / study notes / flashcard fronts / section
// headings hardcode a dark inline color (#1e293b/#0f172a/#334155) that collides 1:1 with
// the dark .card/.fc/body background → invisible. theme.css rescues them under body.dark;
// :not([style*=background]) skips light-islands (code blocks, note editors, overlays).
// (Light-*background* islands were fixed earlier in v10.4.34/#151 — guarded by darkIslands.test.js.)
const theme = readFileSync('src/styles/theme.css', 'utf8');

describe('dark-mode inverse dark-on-dark fix (v10.4.37 audit P1)', () => {
  it('rescues hardcoded dark inline prose colors under body.dark, skipping islands', () => {
    for (const hex of ['1e293b', '0f172a', '334155']) {
      expect(theme).toMatch(
        new RegExp(`body\\.dark \\[style\\*=";color:#${hex}"\\]:not\\(\\[style\\*="background"\\]\\)`)
      );
    }
    // the island-guard must be present so code blocks / note editors stay legible
    expect(theme).toContain(':not([style*="background"])');
  });
});
