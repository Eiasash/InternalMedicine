import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');

function readFile(filename) {
  return readFileSync(resolve(rootDir, filename), 'utf-8');
}

describe('pnimit-mega.html', () => {
  let html;

  beforeAll(() => {
    html = readFile('pnimit-mega.html');
  });

  test('file exists', () => {
    expect(existsSync(resolve(rootDir, 'pnimit-mega.html'))).toBe(true);
  });

  test('starts with <!DOCTYPE html>', () => {
    expect(html.trimStart().startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('has RTL lang attribute (lang="he")', () => {
    expect(html).toMatch(/<html\s[^>]*lang="he"/);
  });

  test('has viewport meta tag', () => {
    expect(html).toMatch(/<meta\s[^>]*name="viewport"/);
  });

  test('has APP_VERSION constant', () => {
    const constants = readFile('src/core/constants.js');
    expect(constants).toMatch(/const\s+APP_VERSION\s*=\s*['"][^'"]+['"]/);
  });

  test('references manifest.json', () => {
    expect(html).toMatch(/href="manifest\.json"/);
  });

  test('registers service worker (sw.js)', () => {
    // SW registration lives in core/sw-update.js; app.js imports + calls initSWUpdate.
    const swUpdate = readFile('src/core/sw-update.js');
    expect(swUpdate).toMatch(/navigator\.serviceWorker\.register\(['"]sw\.js['"]\)/);
    const appJs = readFile('src/ui/app.js');
    expect(appJs).toMatch(/initSWUpdate\s*\(/);
  });
});

describe('sw.js', () => {
  test('file exists', () => {
    expect(existsSync(resolve(rootDir, 'sw.js'))).toBe(true);
  });
});

describe('manifest.json', () => {
  let manifest;

  test('file exists and is valid JSON', () => {
    const raw = readFile('manifest.json');
    manifest = JSON.parse(raw);
    expect(manifest).toBeDefined();
  });

  test('has required PWA fields', () => {
    const raw = readFile('manifest.json');
    manifest = JSON.parse(raw);
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
  });
});

describe('version synchronization', () => {
  test('APP_VERSION in constants.js matches cache version in sw.js', () => {
    const constants = readFile('src/core/constants.js');
    const sw = readFile('sw.js');

    const appMatch = constants.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    const swMatch = sw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/);

    expect(appMatch).not.toBeNull();
    expect(swMatch).not.toBeNull();
    expect(appMatch[1]).toBe(swMatch[1]);
  });
});

describe('security checks', () => {
  let html;

  beforeAll(() => {
    html = readFile('pnimit-mega.html');
  });

  test('no eval() usage', () => {
    // Match eval( but not in comments or string literals mentioning eval
    // Simple check: no standalone eval( calls
    const evalCalls = html.match(/[^a-zA-Z_.]eval\s*\(/g);
    expect(evalCalls).toBeNull();
  });

  test('innerHTML assignments use sanitize() for dynamic data', () => {
    // Find innerHTML assignments that concatenate variables
    // Lines with innerHTML that include e.message without sanitize are low-risk (error objects)
    // Flag any innerHTML with direct user input patterns (location, input.value, etc.)
    const lines = html.split('\n');
    const unsanitized = [];
    lines.forEach((line, idx) => {
      if (line.includes('innerHTML') && line.includes('location.hash')) {
        unsanitized.push(`Line ${idx + 1}: innerHTML with location.hash`);
      }
      if (line.includes('innerHTML') && line.includes('input.value') && !line.includes('sanitize')) {
        unsanitized.push(`Line ${idx + 1}: innerHTML with unsanitized input.value`);
      }
    });
    expect(unsanitized).toEqual([]);
  });

  test('has Content-Security-Policy meta tag', () => {
    expect(html).toMatch(/Content-Security-Policy/);
  });

  test('no inline onclick= in HTML shell', () => {
    expect(html).not.toMatch(/\sonclick\s*=/i);
  });

  test('no inline <script> blocks in HTML shell', () => {
    // Allow <script src="..."> but not <script> with inline code
    const inlineScripts = html.match(/<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/gi);
    expect(inlineScripts).toBeNull();
  });

  test('CSP script-src does not allow unsafe-inline', () => {
    const csp = html.match(/script-src\s+([^;]+)/);
    expect(csp).not.toBeNull();
    expect(csp[1]).not.toContain('unsafe-inline');
  });
});

describe('inline handler hygiene — source files', () => {
  const glob = require('fs');
  const path = require('path');

  function allJsFiles(dir) {
    const results = [];
    for (const entry of glob.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...allJsFiles(full));
      else if (entry.name.endsWith('.js')) results.push(full);
    }
    return results;
  }

  const srcFiles = allJsFiles(resolve(rootDir, 'src'));

  test('no inline onclick= attributes in template strings', () => {
    const violations = [];
    for (const f of srcFiles) {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Match onclick="..." in template strings — skip programmatic .onclick= assignments
        if (/onclick\s*=\s*"/.test(line) || /onclick\s*=\s*'/.test(line) || /onclick\s*=\s*\\/.test(line)) {
          violations.push(`${path.relative(rootDir, f)}:${i + 1}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  test('no inline onchange= attributes in template strings', () => {
    const violations = [];
    for (const f of srcFiles) {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/onchange\s*=\s*"/.test(line) || /onchange\s*=\s*'/.test(line)) {
          violations.push(`${path.relative(rootDir, f)}:${i + 1}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  test('no inline oninput= attributes in template strings', () => {
    const violations = [];
    for (const f of srcFiles) {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/oninput\s*=\s*"/.test(line) || /oninput\s*=\s*'/.test(line)) {
          violations.push(`${path.relative(rootDir, f)}:${i + 1}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
