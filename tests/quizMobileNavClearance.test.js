import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const quizViewJs = readFileSync(
  fileURLToPath(new URL('../src/ui/quiz-view.js', import.meta.url)),
  'utf8',
);
const quizCss = readFileSync(
  fileURLToPath(new URL('../src/styles/quiz.css', import.meta.url)),
  'utf8',
);
const layoutCss = readFileSync(
  fileURLToPath(new URL('../src/styles/layout.css', import.meta.url)),
  'utf8',
);
const themeCss = readFileSync(
  fileURLToPath(new URL('../src/styles/theme.css', import.meta.url)),
  'utf8',
);

describe('mobile quiz bottom-nav clearance', () => {
  it('renders the answer action row with stable classes instead of inline layout only', () => {
    const quizCardCount = (quizViewJs.match(/class="card quiz-card" style="padding:16px"/g) || []).length;

    expect(quizViewJs).toContain('<div class="quiz-answer-stack">');
    expect(quizViewJs).toContain('<div class="quiz-primary-actions">');
    expect(quizCardCount).toBeGreaterThanOrEqual(2);
    expect(quizViewJs).not.toContain('<div class="card" style="padding:16px">');
    expect(quizViewJs).not.toContain('<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">');
    expect(quizViewJs).not.toContain('class="quiz-answer-actions"');
    expect(quizViewJs).not.toContain('<div style="display:flex;gap:6px;align-items:center"><button class="btn btn-p" data-action="check-answer"');
  });

  it('keeps primary quiz actions above the fixed tab bar on phones', () => {
    expect(quizCss).toMatch(/\.card\.quiz-card\s*\{[^}]*overflow:\s*visible/);
    expect(quizCss).toMatch(/@media \(max-width: 600px\)[\s\S]*\.quiz-primary-actions[\s\S]*position:\s*sticky/);
    expect(quizCss).toMatch(/\.quiz-primary-actions[\s\S]*bottom:\s*calc\(58px \+ env\(safe-area-inset-bottom\)\)/);
    expect(layoutCss).toMatch(/@media \(max-width: 600px\)[\s\S]*\.ct\s*\{[^}]*padding-bottom:\s*calc\(110px \+ env\(safe-area-inset-bottom\)\)/);
    expect(themeCss).toContain('body.dark .quiz-primary-actions');
  });
});
