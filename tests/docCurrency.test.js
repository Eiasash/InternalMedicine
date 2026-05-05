/**
 * Doc currency guards — fails CI when CLAUDE.md drifts from package.json.
 *
 * Bug class observed 2026-05-05: CLAUDE.md said "Current version: v10.4.3
 * (as of 2026-05-01)" while pkg.version was 10.4.13 — 10 versions stale,
 * silently rotting between releases.
 *
 * Pnimit version quirk: package.json carries APP_VERSION + ".0"
 * (e.g. pkg "10.4.13.0" === APP_VERSION "10.4.13"). CLAUDE.md uses the
 * APP_VERSION shape, so we strip the trailing ".0" before comparing.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

function appVersionFromPkg(pkgVersion) {
  return pkgVersion.endsWith(".0")
    ? pkgVersion.slice(0, -2)
    : pkgVersion;
}

describe("CLAUDE.md currency vs package.json", () => {
  let content;
  let appVer;

  beforeAll(() => {
    content = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf-8");
    const pkgVer = JSON.parse(
      readFileSync(resolve(ROOT, "package.json"), "utf-8")
    ).version;
    appVer = appVersionFromPkg(pkgVer);
  });

  it('"**Current version**: vX.Y.Z" line matches APP_VERSION', () => {
    const m = content.match(/\*\*Current version\*\*:\s*v(\d+\.\d+\.\d+)/);
    expect(m, 'no "**Current version**: vX.Y.Z" line in CLAUDE.md').not.toBeNull();
    expect(m[1]).toBe(appVer);
  });
});
