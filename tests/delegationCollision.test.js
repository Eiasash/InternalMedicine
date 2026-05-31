import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';

// Every initXxxEvents in src/ui/ binds a click/change listener to the SAME #ct
// container, so any data-action handled (`action === 'X'`) in more than one of
// these files fires once per file on a single click — a silent double-fire whose
// outcome depends on listener-attachment order (v10.4.35 audit fix).
//
// This guard fails if a data-action is handled in >1 src/ui file. If you add a
// genuinely shared action, give it distinct names per surface (as filter-year ->
// goto-quiz-year did) or route it through a single handler.

describe('event-delegation: no data-action handled in >1 init (no #ct double-fire)', () => {
  it('each handled data-action lives in exactly one src/ui file', () => {
    const byAction = {};
    for (const f of readdirSync('src/ui').filter((f) => f.endsWith('.js'))) {
      const src = readFileSync(`src/ui/${f}`, 'utf8');
      for (const m of src.matchAll(/action\s*===\s*['"]([^'"]+)['"]/g)) {
        (byAction[m[1]] ||= new Set()).add(f);
      }
    }
    const collisions = Object.entries(byAction)
      .filter(([, fs]) => fs.size > 1)
      .map(([a, fs]) => `${a}: ${[...fs].join(', ')}`);
    expect(collisions, `data-action handled in >1 init (fires once per init on #ct):\n${collisions.join('\n')}`).toEqual([]);
  });
});
