import { readFileSync } from 'fs';
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

  test('has install event listener', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
  });

  test('has fetch event listener', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('has activate handler with cache cleanup', () => {
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
    // Verify it deletes old caches
    expect(sw).toMatch(/caches\.delete/);
  });

  test('caches pnimit-mega.html', () => {
    expect(sw).toMatch(/pnimit-mega\.html/);
  });

  test('caches data JSON files', () => {
    const requiredFiles = [
      'data/questions.json',
      'data/topics.json',
      'data/notes.json',
      'data/flashcards.json',
      'data/tabs.json'
    ];
    requiredFiles.forEach(file => {
      expect(sw).toContain(file);
    });
  });

  test('caches manifest.json', () => {
    expect(sw).toContain('manifest.json');
  });

  test('uses skipWaiting in install handler', () => {
    expect(sw).toMatch(/skipWaiting/);
  });

  test('uses clients.claim in activate handler', () => {
    expect(sw).toMatch(/clients\.claim/);
  });
});
