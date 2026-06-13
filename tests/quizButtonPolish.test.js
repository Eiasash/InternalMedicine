import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const quizViewJs = readFileSync(
  fileURLToPath(new URL('../src/ui/quiz-view.js', import.meta.url)),
  'utf8',
);
const componentsCss = readFileSync(
  fileURLToPath(new URL('../src/styles/components.css', import.meta.url)),
  'utf8',
);

describe('Quiz button polish guards', () => {
  it('renders interactive filter pills as real buttons, not clickable spans', () => {
    expect(quizViewJs).not.toMatch(/<span class="pill[^"]*"[^>]*data-action=/);
    expect(quizViewJs).toMatch(/<button type="button" class="pill/);
    expect(quizViewJs).toMatch(/aria-pressed=/);
  });

  it('defines the due-review filter exactly once so the row cannot duplicate it', () => {
    const dueDefinitions = quizViewJs.match(/data-f="due"/g) || [];
    expect(dueDefinitions.length).toBe(1);
  });

  it('resets native button chrome on pill controls', () => {
    expect(componentsCss).toMatch(/\.pill\s*\{[^}]*border:\s*1px solid transparent/s);
    expect(componentsCss).toMatch(/\.pill\s*\{[^}]*font-family:\s*inherit/s);
    expect(componentsCss).toMatch(/\.pill\s*\{[^}]*appearance:\s*none/s);
  });
});
