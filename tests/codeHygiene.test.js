import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression guards for the v10.4.36 code-hygiene fixes (2026-05-31 audit).
const utils = readFileSync('src/core/utils.js', 'utf8');
const quizView = readFileSync('src/ui/quiz-view.js', 'utf8');
const constants = readFileSync('src/core/constants.js', 'utf8');

describe('code hygiene (v10.4.36 audit)', () => {
  it('toast does not use the invalid `direction:auto` CSS value', () => {
    // `direction` has no `auto` keyword — the declaration is dropped, leaving an
    // English toast to inherit the page RTL. Use unicode-bidi:plaintext instead.
    expect(utils).not.toMatch(/direction:\s*auto/);
  });

  it('skeleton loader does not reference undefined --fg2/--fg3 CSS vars', () => {
    // rgb(var(--fg2|3)) with an undefined custom property is an invalid value → dropped.
    expect(quizView).not.toMatch(/var\(--fg[23]\)/);
  });

  it('the frozen BUILD_HASH literal is gone', () => {
    // It was hardcoded to 2026-04-15 and shown as a misleading "build 20260415".
    expect(constants).not.toContain('BUILD_HASH');
  });
});
