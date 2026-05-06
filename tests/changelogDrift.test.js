/**
 * CHANGELOG drift regression test.
 *
 * 2026-05-06: noticed APP_VERSION='10.4.17' in src/core/constants.js but the
 * latest CHANGELOG entry was '10.4.13' — 4 missing entries (10.4.14, 10.4.15,
 * 10.4.16, 10.4.17). Nothing actively prevented the drift.
 *
 * The version-trinity guard (APP_VERSION ↔ sw.js CACHE ↔ package.json) catches
 * version-bump misalignment but does NOT check whether the CURRENT version has
 * a corresponding CHANGELOG entry. This test fills that gap.
 *
 * If this fails:
 *   - Easy fix: add an entry like `'<APP_VERSION>':[` inside CHANGELOG={...}.
 *
 * Sibling-paired with Geriatrics/tests/changelogDrift.test.js and
 * FamilyMedicine/tests/changelogDrift.test.js.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const constantsJs = readFileSync(resolve(ROOT, 'src/core/constants.js'), 'utf-8');

describe('CHANGELOG drift guard', () => {
  it('APP_VERSION export is parseable from src/core/constants.js', () => {
    const m = constantsJs.match(/export\s+const\s+APP_VERSION\s*=\s*'([^']+)'/);
    expect(m, 'APP_VERSION export not found').toBeTruthy();
    expect(m[1]).toMatch(/^\d+\.\d+(\.\d+)?$/);
  });

  it('current APP_VERSION has a corresponding CHANGELOG entry', () => {
    const versionMatch = constantsJs.match(/export\s+const\s+APP_VERSION\s*=\s*'([^']+)'/);
    expect(versionMatch).toBeTruthy();
    const version = versionMatch[1];
    // CHANGELOG entries take the form `'<version>':[` inside the export const CHANGELOG={...} block.
    const entryRegex = new RegExp(`'${version.replace(/\./g, '\\.')}'\\s*:\\s*\\[`);
    expect(
      constantsJs,
      `CHANGELOG missing an entry for current APP_VERSION='${version}'. ` +
      `Add an entry like "'${version}': [ '...' ]," inside the export const CHANGELOG={ block.`
    ).toMatch(entryRegex);
  });

  it('CHANGELOG export opens with a known marker (sanity check)', () => {
    expect(constantsJs).toMatch(/export\s+const\s+CHANGELOG\s*=\s*\{/);
  });
});
