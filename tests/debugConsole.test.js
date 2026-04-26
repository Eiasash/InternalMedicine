import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname || '.', '..');
const moduleSrc = readFileSync(resolve(root, 'src/debug/console.js'), 'utf8');
const appSrc = readFileSync(resolve(root, 'src/ui/app.js'), 'utf8');

describe('debug console (v9.84)', () => {
  it('imported as the FIRST line of src/ui/app.js so wrappers install before any other module', () => {
    const debugImport = appSrc.indexOf("import '../debug/console.js'");
    const firstOtherImport = appSrc.indexOf('import G from');
    expect(debugImport, 'debug/console.js import present').toBeGreaterThan(0);
    expect(debugImport, 'debug import precedes G import').toBeLessThan(firstOtherImport);
  });

  it('5-tap counter logic exists (taps array + corner check + 3000ms window)', () => {
    expect(moduleSrc).toMatch(/let taps = \[\]/);
    expect(moduleSrc).toMatch(/taps\.length >= 5/);
    expect(moduleSrc).toMatch(/const corner = \(x, y\)/);
    expect(moduleSrc).toMatch(/n - z < 3000/);
  });

  it('copy-to-clipboard handler exists with execCommand fallback', () => {
    expect(moduleSrc).toMatch(/navigator\.clipboard\.writeText/);
    expect(moduleSrc).toMatch(/document\.execCommand\(['"]copy['"]\)/);
  });

  it('exposes window.__debug API with show/report/buffer/clear', () => {
    expect(moduleSrc).toMatch(/window\.__debug\s*=\s*\{/);
    expect(moduleSrc).toMatch(/show:\s*showDebugPanel/);
    expect(moduleSrc).toMatch(/report:\s*\(\)/);
    expect(moduleSrc).toMatch(/buffer,/);
    expect(moduleSrc).toMatch(/clear:\s*\(\)/);
  });

  it('report format uses === DEBUG REPORT === plain-text headers', () => {
    expect(moduleSrc).toMatch(/=== DEBUG REPORT ===/);
    expect(moduleSrc).toMatch(/=== RECENT ERRORS/);
    expect(moduleSrc).toMatch(/=== RECENT CONSOLE/);
    expect(moduleSrc).toMatch(/=== RECENT NETWORK/);
    expect(moduleSrc).toMatch(/=== RECENT ACTIONS/);
    expect(moduleSrc).toMatch(/=== END REPORT ===/);
  });

  it('captures console + errors + fetch + clicks', () => {
    expect(moduleSrc).toMatch(/\['log', 'info', 'warn', 'error', 'debug'\]\.forEach/);
    expect(moduleSrc).toMatch(/window\.addEventListener\(['"]error['"]/);
    expect(moduleSrc).toMatch(/window\.addEventListener\(['"]unhandledrejection['"]/);
    expect(moduleSrc).toMatch(/window\.fetch = function/);
    expect(moduleSrc).toMatch(/document\.addEventListener\(\s*['"]click['"]/);
  });
});
