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

describe('Study/Track IA regression guards', () => {
  it('keeps core exam mode launch buttons visible in Quiz', () => {
    expect(quizViewJs).toMatch(/data-action="start-exam"[^>]*>/);
    expect(quizViewJs).toMatch(/data-action="start-mock"[^>]*>/);
  });

  it('keeps retired mode launch buttons out of visible quiz controls', () => {
    expect(quizViewJs).not.toMatch(/data-action="start-sd"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-oncall"[^>]*>/);
    expect(quizViewJs).not.toMatch(/data-action="start-pomo"[^>]*>/);
  });

  it('keeps utility actions in Settings About', () => {
    expect(settingsOverlayJs).toContain('data-action="settings-share-app"');
    expect(settingsOverlayJs).toContain('data-action="settings-force-update"');
    expect(settingsOverlayJs).toContain('Geriatrics');
  });
});
