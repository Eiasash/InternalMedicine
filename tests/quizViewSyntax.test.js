import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const quizViewPath = resolve(import.meta.dirname, '..', 'src', 'ui', 'quiz-view.js');

describe('image/explanation verification buttons - template-literal regression guard', () => {
  it('active mark-e-verified data-idx uses ${...} interpolation', () => {
    const src = readFileSync(quizViewPath, 'utf-8');
    const match = src.match(/data-action="mark-e-verified"[^>]*data-idx=([^\s>]+)/);
    expect(match, 'could not locate mark-e-verified button').toBeTruthy();
    expect(match[1]).toMatch(/\$\{/);
    expect(match[1]).not.toMatch(/^"'\+/);
  });

  it('deleted SD-only verification actions do not reintroduce string-concat data indexes', () => {
    const src = readFileSync(quizViewPath, 'utf-8');
    expect(src).not.toMatch(/data-action="(?:mark-verified|clear-eflag|remove-img)"[^>]*data-idx="'\+/);
  });
});
