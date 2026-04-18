/**
 * Guards TOPIC_REF → harrison_chapters.json coverage.
 *
 * Every TOPIC_REF entry with s:'har' has a .ch that powers the
 * "📖 Read: Harrison Ch X — you're weak here" button in the quiz view.
 * If .ch doesn't exist as a key in harrison_chapters.json, the button
 * silently opens the chapter viewer on an empty chapter — which is the
 * class of bug that cost Geriatrics a full PR-cycle to catch (the Hazzard
 * equivalent was pointing at libSec='harrison', wrong section entirely).
 *
 * This test ensures any future topic added to TOPIC_REF has chapter
 * content on disk before the feature ships.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Shim browser globals touched by the import chain (fsrs-bridge, globals).
// Tests run under node env without jsdom.
globalThis.window = globalThis.window || globalThis;
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { TOPIC_REF } = await import('../src/ui/track-view.js');

const rootDir = resolve(import.meta.dirname, '..');
const chapters = JSON.parse(
  readFileSync(resolve(rootDir, 'harrison_chapters.json'), 'utf-8'),
);

describe('TOPIC_REF → Harrison chapter coverage', () => {
  it('every Harrison ref (.s==="har") resolves to a chapter in harrison_chapters.json', () => {
    const misses = [];
    for (const [ti, ref] of Object.entries(TOPIC_REF)) {
      if (!ref || ref.s !== 'har') continue;
      if (!chapters[String(ref.ch)]) {
        misses.push({ ti, ch: ref.ch, label: ref.l });
      }
    }
    expect(
      misses,
      `TOPIC_REF entries pointing at nonexistent chapters: ${JSON.stringify(misses, null, 2)}`,
    ).toEqual([]);
  });

  it('every Harrison ref has a positive integer .ch and a label', () => {
    for (const [ti, ref] of Object.entries(TOPIC_REF)) {
      if (!ref || ref.s !== 'har') continue;
      expect(Number.isInteger(ref.ch), `TOPIC_REF[${ti}].ch is not an integer`).toBe(true);
      expect(ref.ch, `TOPIC_REF[${ti}].ch must be positive`).toBeGreaterThan(0);
      expect(typeof ref.l, `TOPIC_REF[${ti}].l must be a string`).toBe('string');
      expect(ref.l.length, `TOPIC_REF[${ti}].l must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('TOPIC_REF only uses the whitelisted source keys {har, notes}', () => {
    const allowedSources = new Set(['har', 'notes']);
    for (const [ti, ref] of Object.entries(TOPIC_REF)) {
      if (!ref) continue;
      expect(
        allowedSources.has(ref.s),
        `TOPIC_REF[${ti}].s="${ref.s}" — expected 'har' or 'notes'`,
      ).toBe(true);
    }
  });
});
