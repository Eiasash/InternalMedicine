import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const trackViewJs = readFileSync(
  fileURLToPath(new URL('../src/ui/track-view.js', import.meta.url)),
  'utf8',
);
const trackCss = readFileSync(
  fileURLToPath(new URL('../src/styles/track.css', import.meta.url)),
  'utf8',
);

describe('Study dashboard button depth cleanup', () => {
  it('uses classed daily-plan rows instead of tiny inline action chips', () => {
    expect(trackViewJs).toContain('class="daily-plan-steps"');
    expect(trackViewJs).toContain('daily-plan-action daily-plan-action--');
    expect(trackViewJs).toContain('type="button" class="daily-plan-action');
    expect(trackViewJs).not.toMatch(/data-action="goto-quiz"[^>]+font-size:9px/);
    expect(trackViewJs).not.toMatch(/data-action="start-mini-exam"[^>]+font-size:9px/);
    expect(trackViewJs).not.toMatch(/data-action="replay-last-mock-wrong"[^>]+font-size:9px/);
  });

  it('keeps the long study plan compact by default', () => {
    expect(trackViewJs).toContain("G.S['sp_t' + tier.tier] : false");
    expect(trackViewJs).not.toContain("G.S['sp_t' + tier.tier] : true");
  });

  it('gives daily and study-plan controls full mobile tap targets', () => {
    expect(trackCss).toMatch(/\.daily-plan-steps\s*\{[^}]*display:\s*grid/s);
    expect(trackCss).toMatch(/\.daily-plan-action\s*\{[^}]*min-height:\s*38px/s);
    expect(trackCss).toMatch(/\.sp-actions\s*\{[^}]*display:\s*grid/s);
    expect(trackCss).toMatch(/@media \(max-width: 520px\)[\s\S]*\.daily-plan-action\s*\{[^}]*width:\s*100%/);
    expect(trackCss).toMatch(/@media \(max-width: 520px\)[\s\S]*\.sp-actions\s*\{[^}]*repeat\(2,/);
  });
});
