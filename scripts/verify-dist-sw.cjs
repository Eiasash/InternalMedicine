#!/usr/bin/env node
// Post-build verification for dist/sw.js (Pnimit).
// Mirrors the Mishpacha verifier — guards against drift between the
// scripts/build.sh heredoc and what the Vite build actually emits at dist/.
// CI (integrity-guard.yml, weekly-audit.yml) only reads repo-root ./sw.js,
// which is a different manifest, so this is the only thing validating what ships.
const fs = require('fs');
const path = require('path');

function fatal(msg) { console.error(`[verify-dist-sw] FATAL: ${msg}`); process.exit(1); }

const distSwPath = 'dist/sw.js';
const constPath = 'src/core/constants.js';
if (!fs.existsSync(distSwPath)) fatal(`${distSwPath} missing — did scripts/build.sh run to completion?`);
if (!fs.existsSync(constPath)) fatal(`${constPath} missing`);

const distSw = fs.readFileSync(distSwPath, 'utf8');
const constSrc = fs.readFileSync(constPath, 'utf8');

const mApp = constSrc.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const mCache = distSw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/);
if (!mApp) fatal('APP_VERSION not found in src/core/constants.js');
if (!mCache) fatal('CACHE (pnimit-vX.Y) not found in dist/sw.js');
if (mApp[1] !== mCache[1]) {
  fatal(`version drift — APP_VERSION=${mApp[1]}, dist/sw.js CACHE=pnimit-v${mCache[1]}`);
}

function extractList(src, name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}
const shell = extractList(distSw, 'SHELL_URLS');
const data = extractList(distSw, 'DATA_URLS');
if (!shell) fatal('SHELL_URLS array not found in dist/sw.js');
if (!data) fatal('DATA_URLS array not found in dist/sw.js');
const all = [...shell, ...data];

const missing = all.filter(p => !fs.existsSync(path.join('dist', p)));
if (missing.length) {
  console.error(`[verify-dist-sw] FATAL: ${missing.length} SW-manifested file(s) missing from dist/:`);
  missing.forEach(f => console.error(`  ✗ dist/${f}`));
  console.error('Either add the file to scripts/build.sh cp steps, or remove from the SW heredoc.');
  process.exit(1);
}
const dupes = all.filter((v, i, a) => a.indexOf(v) !== i);
if (dupes.length) fatal(`duplicate entries in ALL_URLS: ${dupes.join(', ')}`);

console.log(`[verify-dist-sw] OK — CACHE=pnimit-v${mCache[1]}, ${all.length} cached paths verified (${shell.length} shell + ${data.length} data)`);
