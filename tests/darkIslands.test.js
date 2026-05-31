import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression guard for the v10.4.34 dark-mode light-island fixes.
// Several surfaces shipped inline light backgrounds (#fff / #fef2f2 / #fffbeb) that
// override `body.dark .card` or inherit a light bg → bright islands in dark mode.
const theme = readFileSync('src/styles/theme.css', 'utf8');
const moreView = readFileSync('src/ui/more-view.js', 'utf8');
const trackView = readFileSync('src/ui/track-view.js', 'utf8');

describe('dark-mode light-island fixes (v10.4.34 audit)', () => {
  it('theme.css carries body.dark overrides for each inline-light surface', () => {
    for (const sel of [
      'body.dark .chat-msg-err',
      'body.dark #gnotes-ta',
      'body.dark .gnotes-panel',
      'body.dark .qnote-card',
      'body.dark .due-alert',
    ]) {
      expect(theme, `missing dark override: ${sel}`).toContain(sel);
    }
  });

  it('the inline-styled surfaces carry their dark-override hook classes', () => {
    expect(moreView).toContain('class="gnotes-panel"');
    expect(moreView).toContain('class="qnote-card"');
    expect(trackView).toContain('class="card due-alert"');
  });
});
