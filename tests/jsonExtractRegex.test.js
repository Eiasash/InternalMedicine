/**
 * Guard: no src/ file may contain the corrupted `[\s\G.S]` regex class,
 * and the feedback log must say "Report save failed:" (not "G.save").
 *
 * Backstory: a state-rename find/replace (save → G.save) touched non-code
 * spans too. That turned `[\s\S]` (any char) into `[\s\G.S]` (the literal
 * characters {whitespace, G, ., S}), so the teach-back JSON extractor
 * silently started returning {} on every call. Fixed on the feature
 * branch; this test prevents regressions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const srcRoot = resolve(process.cwd(), 'src');
const srcFiles = walk(srcRoot);

describe('JSON-extract regex health (src/**)', () => {
  it('has at least one .js file under src/ to scan', () => {
    expect(srcFiles.length).toBeGreaterThan(0);
  });

  it('no src file contains the corrupted [\\s\\G.S] character class', () => {
    const offenders = srcFiles.filter(f =>
      /\[\\s\\G\.S\]/.test(readFileSync(f, 'utf-8'))
    );
    expect(offenders).toEqual([]);
  });

  it('no src file logs "Report G.save failed" (canonical: "Report save failed")', () => {
    const offenders = srcFiles.filter(f =>
      /Report G\.save failed/.test(readFileSync(f, 'utf-8'))
    );
    expect(offenders).toEqual([]);
  });
});
