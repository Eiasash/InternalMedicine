import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const quizViewJs = readFileSync(
  fileURLToPath(new URL('../src/ui/quiz-view.js', import.meta.url)),
  'utf8',
);
const settingsOverlayJs = readFileSync(
  fileURLToPath(new URL('../src/ui/settings-overlay.js', import.meta.url)),
  'utf8',
);
const globalsJs = readFileSync(
  fileURLToPath(new URL('../src/core/globals.js', import.meta.url)),
  'utf8',
);
const engineJs = readFileSync(
  fileURLToPath(new URL('../src/quiz/engine.js', import.meta.url)),
  'utf8',
);
const modesJs = readFileSync(
  fileURLToPath(new URL('../src/quiz/modes.js', import.meta.url)),
  'utf8',
);

describe('Study/Track IA regression guards', () => {
  it('keeps core exam mode launch buttons visible in Quiz', () => {
    expect(quizViewJs).toMatch(/data-action="start-exam"[^>]*>/);
    expect(quizViewJs).toMatch(/data-action="start-mock"[^>]*>/);
  });

  it('collapses advanced quiz filters behind one drawer', () => {
    expect(quizViewJs).toContain('quiz-filter-summary');
    expect(quizViewJs).toContain('quiz-filter-drawer');
    expect(quizViewJs).toContain('data-action="toggle-quiz-filters"');
    expect(quizViewJs).toContain('aria-expanded="${G.quizFiltersOpen');
    expect(quizViewJs).toContain('Cover options');
    expect(quizViewJs).toContain('Timed 90s');
  });

  it('keeps retired mode launch buttons out of visible quiz controls', () => {
    expect(quizViewJs).not.toMatch(/data-action="start-sd"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-oncall"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-pomo"[^>]*>/);
  });

  it('removes retired mode state and handlers from active quiz code', () => {
    const active = [quizViewJs, globalsJs, engineJs, modesJs].join('\n');
    expect(active).not.toMatch(/startSuddenDeath|endSuddenDeath|sdMode|sdPool|sdStreak|sdLeaderboard/);
    expect(active).not.toMatch(/startOnCallMode|renderOnCall|onCallMode|flipRevealed|onCallPick|runExplainOnCall/);
    expect(active).not.toMatch(/startPomodoro|stopPomodoro|pomoActive|pomoInterval|pomoSec|pomoBreak/);
  });

  it('keeps utility actions in Settings About', () => {
    expect(settingsOverlayJs).toContain('data-action="settings-share-app"');
    expect(settingsOverlayJs).toContain('data-action="settings-force-update"');
    expect(settingsOverlayJs).toContain('Geriatrics');
  });
});
