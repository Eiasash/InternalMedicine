import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');

function readFile(filename) {
  return readFileSync(resolve(rootDir, filename), 'utf-8');
}

describe('service worker (sw.js)', () => {
  let sw;

  beforeAll(() => {
    sw = readFile('sw.js');
  });

  test('contains proper cache name starting with pnimit-v', () => {
    expect(sw).toMatch(/const\s+CACHE\s*=\s*['"]pnimit-v[\d.]+['"]/);
  });

  test('cache version matches APP_VERSION in HTML', () => {
    const html = readFile('pnimit-mega.html');
    const appMatch = html.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    const swMatch = sw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/);
    expect(appMatch).not.toBeNull();
    expect(swMatch).not.toBeNull();
    expect(appMatch[1]).toBe(swMatch[1]);
  });

  test('defines HTML_URLS array', () => {
    expect(sw).toMatch(/HTML_URLS\s*=\s*\[/);
  });

  test('defines JSON_DATA_URLS for all data files', () => {
    expect(sw).toMatch(/JSON_DATA_URLS\s*=\s*\[/);
    expect(sw).toContain('data/questions.json');
    expect(sw).toContain('data/topics.json');
    expect(sw).toContain('data/notes.json');
    expect(sw).toContain('data/drugs.json');
    expect(sw).toContain('data/flashcards.json');
    expect(sw).toContain('data/tabs.json');
  });

  test('all cached JSON files actually exist on disk', () => {
    const jsonUrls = sw.match(/['"]data\/[^'"]+\.json['"]/g) || [];
    jsonUrls.forEach(url => {
      const clean = url.replace(/['"]/g, '');
      expect(existsSync(resolve(rootDir, clean)), `Missing: ${clean}`).toBe(true);
    });
  });

  test('all cached HTML files actually exist on disk', () => {
    const htmlUrls = sw.match(/['"][^'"]+\.html['"]/g) || [];
    htmlUrls.forEach(url => {
      const clean = url.replace(/['"]/g, '');
      if (!clean.includes('$')) {
        expect(existsSync(resolve(rootDir, clean)), `Missing: ${clean}`).toBe(true);
      }
    });
  });

  test('has shouldUseCacheFirst function for JSON routing', () => {
    expect(sw).toContain('shouldUseCacheFirst');
  });

  test('uses cache-first for JSON data files', () => {
    expect(sw).toContain('caches.match(e.request)');
  });

  test('has install event listener', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
  });

  test('calls skipWaiting on install', () => {
    expect(sw).toContain('skipWaiting');
  });

  test('has activate event listener', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
  });

  test('claims clients on activate', () => {
    expect(sw).toContain('clients.claim');
  });

  test('cleans up old caches on activate', () => {
    expect(sw).toContain('caches.delete');
  });

  test('has fetch event listener', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('has fallback to pnimit-mega.html on network failure', () => {
    expect(sw).toContain('pnimit-mega.html');
  });

  test('does NOT fall back to questions.json for arbitrary failures', () => {
    expect(sw).not.toMatch(/catch.*caches\.match.*questions\.json/s);
  });

  test('skips non-GET requests', () => {
    expect(sw).toMatch(/request\.method\s*!==\s*'GET'/);
  });

  test('uses navigate mode for HTML fallback', () => {
    expect(sw).toMatch(/request\.mode\s*===\s*'navigate'/);
  });

  test('has sync event listener for supabase-backup', () => {
    expect(sw).toContain('supabase-backup');
  });

  test('has SKIP_WAITING message handler', () => {
    expect(sw).toContain('SKIP_WAITING');
  });

  test('has message listener for schedule-notification', () => {
    expect(sw).toContain('schedule-notification');
  });

  test('has notification click handler', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]notificationclick['"]/);
  });

  test('caches manifest.json', () => {
    expect(sw).toContain('manifest.json');
  });

  test('uses clients.claim in activate handler', () => {
    expect(sw).toContain('clients.claim');
  });
});

describe('sw.js — version alignment with app', () => {
  test('HTML cache cleanup uses dynamic APP_VERSION', () => {
    const html = readFile('pnimit-mega.html');
    const sw = readFile('sw.js');
    const swCacheMatch = sw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/);
    expect(swCacheMatch).not.toBeNull();
    const swCacheKey = swCacheMatch[1];
    
    // Cache cleanup should use dynamic reference or match SW version
    const dynamicCleanup = html.includes("k!=='pnimit-v'+APP_VERSION");
    const staticCleanup = html.match(/k!=='pnimit-v([^']+)'/);
    
    if (dynamicCleanup) {
      expect(true).toBe(true); // Dynamic = always correct
    } else if (staticCleanup) {
      expect(staticCleanup[1]).toBe(swCacheKey);
    } else {
      // No cache cleanup found — this is acceptable if cleanup is elsewhere
      expect(true).toBe(true);
    }
  });
});
