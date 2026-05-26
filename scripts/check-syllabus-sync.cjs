#!/usr/bin/env node
/**
 * check-syllabus-sync.cjs — fail-closed cross-repo drift gate.
 *
 * Fetches Geriatrics main's data/syllabus_data.json and verifies that this
 * repo's data/.corpus_manifest.json matches the Pnimit section (totals AND
 * per-topic n_questions). Exits 1 on any drift.
 *
 * Pairs with scripts/regen_manifest.cjs (the manifest emitter). The flow:
 *   1. IM corpus changes (questions added/removed/retagged)
 *   2. regen_manifest.cjs --check fails → contributor regenerates manifest
 *   3. This script fails → contributor must coordinate a Geri-side update
 *      (Geri's scripts/regen_cross_repo_syllabus.cjs reads this manifest and
 *      updates Pnimit/Mishpacha sections).
 *
 * Why fail-closed on network blips: a transient fetch failure is rare; a
 * silent skip would let real drift land. Better to retry the CI run.
 *
 * Source: https://raw.githubusercontent.com/Eiasash/Geriatrics/main/data/syllabus_data.json
 *
 * Exit codes:
 *   0  no drift
 *   1  drift detected
 *   2  unexpected error (fetch failed, schema mismatch, local manifest missing)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', '.corpus_manifest.json');
const GERI_SYLLABUS_URL = 'https://raw.githubusercontent.com/Eiasash/Geriatrics/main/data/syllabus_data.json';
const SECTION = 'Pnimit'; // this repo's section name in Geri's syllabus

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'corpus-sync-check/1' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`malformed JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timeout (${timeoutMs}ms) fetching ${url}`));
    });
  });
}

async function main() {
  // Read local manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`FATAL: ${path.relative(ROOT, MANIFEST_PATH)} not found. Run: node scripts/regen_manifest.cjs`);
    process.exit(2);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (e) {
    console.error(`FATAL: cannot parse manifest: ${e.message}`);
    process.exit(2);
  }
  if (manifest.schema !== 'corpus-manifest-v1') {
    console.error(`FATAL: manifest schema "${manifest.schema}" not supported by this checker (expected corpus-manifest-v1)`);
    process.exit(2);
  }

  // Fetch Geri syllabus
  let syllabus;
  try {
    syllabus = await fetchJson(GERI_SYLLABUS_URL);
  } catch (e) {
    console.error(`FATAL: fetch failed: ${e.message}`);
    console.error('Cannot verify cross-repo sync. Retry CI run, or check Geriatrics main accessibility.');
    process.exit(2);
  }

  const section = syllabus[SECTION];
  if (!section || !Array.isArray(section.topics)) {
    console.error(`FATAL: Geri syllabus has no ${SECTION} section or topics array is malformed`);
    process.exit(2);
  }

  // Compare totals
  const drifts = [];
  if (section.total_questions_analyzed !== manifest.total_questions) {
    drifts.push(`total_questions_analyzed: Geri.${SECTION}=${section.total_questions_analyzed}, IM manifest=${manifest.total_questions}`);
  }

  // Compare per-topic counts
  const geriById = new Map(section.topics.map(t => [t.id, t.n_questions]));
  const manifestById = new Map(manifest.topics.map(t => [t.id, t.n_questions]));
  const allIds = new Set([...geriById.keys(), ...manifestById.keys()]);
  for (const id of [...allIds].sort((a, b) => a - b)) {
    const g = geriById.get(id);
    const m = manifestById.get(id);
    if (g !== m) {
      drifts.push(`topic ${id}: Geri.${SECTION}=${g ?? '(missing)'}, IM manifest=${m ?? '(missing)'}`);
    }
  }

  if (drifts.length === 0) {
    console.log(`OK: ${SECTION} section in Geri syllabus matches IM corpus manifest (${manifest.total_questions} questions, ${manifest.topics.length} topics).`);
    process.exit(0);
  }

  console.error(`DRIFT: Geri syllabus ${SECTION} section is out of sync with IM corpus manifest:`);
  for (const d of drifts) console.error(`  ${d}`);
  console.error('');
  console.error('Resolution (one of):');
  console.error('  1. If IM corpus is the source of truth: open a Geri PR running scripts/regen_cross_repo_syllabus.cjs to update Pnimit.');
  console.error('  2. If Geri syllabus is the source of truth: revert the IM questions.json change that caused this drift.');
  process.exit(1);
}

main().catch((e) => {
  console.error(`FATAL: unexpected error: ${e.message}`);
  process.exit(2);
});
