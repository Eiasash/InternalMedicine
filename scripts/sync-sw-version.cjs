#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const constants = fs.readFileSync(path.join(root, 'src/core/constants.js'), 'utf-8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');

const appMatch = constants.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const swMatch = sw.match(/CACHE\s*=\s*['"]pnimit-v([^'"]+)['"]/);

if (!appMatch) { console.error('ERROR: APP_VERSION not found in src/core/constants.js'); process.exit(1); }
if (!swMatch) { console.error('ERROR: CACHE not found in sw.js'); process.exit(1); }
if (appMatch[1] !== swMatch[1]) {
  console.error(`ERROR: version mismatch — constants.js=${appMatch[1]} sw.js=${swMatch[1]}`);
  process.exit(1);
}
console.log(`OK: version ${appMatch[1]}`);
