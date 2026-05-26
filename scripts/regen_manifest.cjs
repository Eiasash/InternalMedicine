#!/usr/bin/env node
/**
 * regen_manifest.cjs — emit data/.corpus_manifest.json from data/questions.json.
 *
 * The manifest is the cross-repo contract published from this corpus repo to
 * the Geriatrics syllabus owner. Geri's syllabus_data.json has a Pnimit section
 * whose `total_questions_analyzed` and per-topic `n_questions` MUST match this
 * manifest. When IM's questions.json changes, this manifest must be regenerated
 * AND Geri's Pnimit section must be re-synced (Geri owns its own regen pass
 * that reads this manifest).
 *
 * Companion files in this PR:
 *   scripts/check-syllabus-sync.cjs — fail-closed CI gate. Fetches Geri main's
 *                                     syllabus_data.json, compares to this
 *                                     manifest, exits 1 on cross-repo drift.
 *
 * Schema: corpus-manifest-v1
 *   {
 *     "schema": "corpus-manifest-v1",
 *     "repo": "InternalMedicine",
 *     "total_questions": <N>,
 *     "topics": [{ "id": <int>, "n_questions": <int> }, ...]   // sorted by id
 *   }
 *
 * Modes:
 *   node scripts/regen_manifest.cjs           regenerate in place
 *   node scripts/regen_manifest.cjs --check   write to .tmp/, diff vs current,
 *                                             exit 1 on drift (CI gate use)
 *
 * Exit codes:
 *   0  no drift (--check) or regen successful (default mode)
 *   1  drift detected (--check) or regen failed (default mode)
 *   2  unexpected error (questions.json unreadable/malformed)
 *
 * Pattern source: scripts/regen_derived.cjs in Eiasash/Geriatrics. This is the
 * cross-repo extension of the denominator-invalidates-all-ratios bug class
 * (originally caught and closed in Geriatrics PR #259). The same drift surface
 * exists between IM's questions.json and Geri's syllabus_data.json Pnimit
 * section; this manifest + the companion verifier close it.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const Q_PATH = path.join(ROOT, 'data', 'questions.json');
const MANIFEST_PATH = path.join(ROOT, 'data', '.corpus_manifest.json');

const CHECK = process.argv.includes('--check');
const REPO_NAME = 'InternalMedicine';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.error(`FATAL: cannot read ${p}: ${e.message}`);
    process.exit(2);
  }
}

function buildManifest(questions) {
  if (!Array.isArray(questions)) {
    console.error(`FATAL: questions.json is not an array (got ${typeof questions})`);
    process.exit(2);
  }
  const topicCounts = new Map();
  let missingTi = 0;
  for (const q of questions) {
    const ti = q.ti;
    if (!Number.isInteger(ti)) {
      missingTi += 1;
      continue;
    }
    topicCounts.set(ti, (topicCounts.get(ti) || 0) + 1);
  }
  if (missingTi > 0) {
    // Warn but don't fail — manifest reflects what's tag-able.
    console.warn(`WARN: ${missingTi} questions have missing/non-integer 'ti' and are excluded from per-topic counts`);
  }
  const topics = Array.from(topicCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([id, n_questions]) => ({ id, n_questions }));
  return {
    schema: 'corpus-manifest-v1',
    repo: REPO_NAME,
    total_questions: questions.length,
    topics,
  };
}

function serialize(manifest) {
  // 2-space pretty + trailing newline, matches Eiasash/Geriatrics convention
  return JSON.stringify(manifest, null, 2) + '\n';
}

function main() {
  const questions = readJson(Q_PATH);
  const next = buildManifest(questions);
  const nextStr = serialize(next);

  if (CHECK) {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`DRIFT: ${path.relative(ROOT, MANIFEST_PATH)} does not exist. Run: node scripts/regen_manifest.cjs`);
      process.exit(1);
    }
    let current;
    try {
      current = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch (e) {
      console.error(`DRIFT: ${path.relative(ROOT, MANIFEST_PATH)} is not valid JSON: ${e.message}`);
      console.error(`Run: node scripts/regen_manifest.cjs`);
      process.exit(1);
    }
    // Structural (semantic) diff — line-ending-agnostic, key-order-agnostic.
    // Raw byte-compare false-positives on Windows with core.autocrlf=true.
    const drifts = [];
    if (current.schema !== next.schema) {
      drifts.push(`schema: manifest=${current.schema}, expected=${next.schema}`);
    }
    if (current.repo !== next.repo) {
      drifts.push(`repo: manifest=${current.repo}, expected=${next.repo}`);
    }
    if (current.total_questions !== next.total_questions) {
      drifts.push(`total_questions: manifest=${current.total_questions}, corpus=${next.total_questions}`);
    }
    const curMap = new Map((current.topics || []).map(t => [t.id, t.n_questions]));
    const nextMap = new Map(next.topics.map(t => [t.id, t.n_questions]));
    const allIds = new Set([...curMap.keys(), ...nextMap.keys()]);
    for (const id of [...allIds].sort((a, b) => a - b)) {
      if (curMap.get(id) !== nextMap.get(id)) {
        drifts.push(`topic ${id}: manifest=${curMap.get(id) ?? '(missing)'}, corpus=${nextMap.get(id) ?? '(missing)'}`);
      }
    }
    if (drifts.length === 0) {
      console.log(`OK: ${path.relative(ROOT, MANIFEST_PATH)} is in sync with data/questions.json (${next.total_questions} questions, ${next.topics.length} topics).`);
      process.exit(0);
    }
    console.error(`DRIFT: ${path.relative(ROOT, MANIFEST_PATH)} is out of sync with data/questions.json:`);
    for (const d of drifts) console.error(`  ${d}`);
    console.error(`  drifted fields: ${drifts.length}`);
    console.error(`Run: node scripts/regen_manifest.cjs`);
    process.exit(1);
  }

  fs.writeFileSync(MANIFEST_PATH, nextStr);
  console.log(`Wrote ${path.relative(ROOT, MANIFEST_PATH)}: ${next.total_questions} questions across ${next.topics.length} topics.`);
}

main();
