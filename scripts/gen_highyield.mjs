#!/usr/bin/env node
// gen_highyield.mjs — Pnimit Mega (Internal Medicine) high-yield board-MCQ generator.
//
// Generates very-high-yield Shlav-Alef (P0064-2025) MCQs grounded in Harrison 22e, routed
// through the Toranot proxy (no local ANTHROPIC_API_KEY needed — the proxy holds the key
// server-side and enforces the cost cap). Output is written to an UNTRACKED working file
// (data/highyield.generated.json) for a separate review + merge pass — this script NEVER
// touches data/questions.json and NEVER auto-merges. Per audit-fix-deploy governance,
// AI-authored exam keys require a human review gate before merge.
//
// Pipeline conventions (shared with the Geriatrics gen_ai_hard_geri.mjs / verify_questions
// lineage): tag t='AI-2026-hy', <=10 Qs per call, max_tokens 8000, options carry NO letter
// prefixes (match the bank), correct slot is shuffled (key tracked through the shuffle),
// CJK / markdown / zero-width junk stripped, schema-validated, deduped vs the live bank.
//
// Usage (proxy mode — default):
//   node scripts/gen_highyield.mjs                 # built-in high-yield plan (~310 Qs)
//   node scripts/gen_highyield.mjs --plan "4:30,9:28,2:26"   # ti:count overrides
//   node scripts/gen_highyield.mjs --only 4,9,14   # restrict the built-in plan to these ti
//   node scripts/gen_highyield.mjs --dry-run       # print the plan, call nothing
//
// Resumable: re-running accumulates into the output file (deduped), so a crashed run can
// be restarted and it will top up each topic toward its target.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ----------------------------- config -----------------------------
const PROXY_URL = process.env.TORANOT_URL || 'https://toranot.netlify.app/api/claude';
const SECRET = process.env.TORANOT_API_SECRET;
if (!SECRET) {
  console.error('Set TORANOT_API_SECRET (the Toranot proxy x-api-secret) to run this script.');
  process.exit(2);
}
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';
const TAG = 'AI-2026-hy';
const MAX_TOKENS = Number(process.env.HY_MAX_TOKENS || 8000);
// Default 1/call: the shared Toranot EDGE proxy hard-caps ~30s, and the model's throughput
// (~40 tok/s under load) makes even a 2-Q rich-prompt call ~26-31s (borderline) and a 3-Q
// call time out (500 "edge function timed out"). 1 Q ≈ 14-16s — safely under the limit and
// reliable under concurrency. Still honors the "<=10 Qs/call" ceiling; override via HY_BATCH.
const BATCH = Math.min(Number(process.env.HY_BATCH || 1), 10);
const CONCURRENCY = Number(process.env.HY_CONCURRENCY || 4);
const OUT = process.env.HY_OUT || join(ROOT, 'data/highyield.generated.json');

const TOPICS = [
  'Cardiology — Coronary',
  'Heart Failure',
  'Arrhythmias & ECG',
  'Valvular & Endocarditis',
  'Hypertension',
  'Pulmonology & VTE',
  'Gastroenterology & Hepatology',
  'Nephrology',
  'Electrolytes & Acid-Base',
  'Endocrinology & Diabetes',
  'Hematology & Coagulation',
  'Oncology & Screening',
  'Infectious Disease',
  'Rheumatology & Autoimmune',
  'Neurology & Stroke',
  'Critical Care & Shock',
  'Dermatology',
  'Allergy & Immunology',
  'Fluids & Volume',
  'Pain & Palliative',
  'Perioperative',
  'Toxicology',
  'Clinical Approach & Diagnostics',
  'Vascular Disease',
]; // ti 0..23 — must match src/core/constants.js TOPICS
const TI_MAX = 23;

// High-yield default plan: thin-coverage x high-exam-frequency topics first.
// (Skips the already-saturated Cardiology-Coronary[0]/Clinical-Approach[22] buckets.)
const DEFAULT_PLAN = {
  4: 26,
  9: 26,
  2: 22,
  14: 22,
  8: 18,
  7: 18,
  12: 18,
  1: 16,
  5: 16,
  6: 14,
  11: 14,
  10: 14,
  13: 12,
  3: 12,
  15: 12,
  16: 10,
  17: 10,
  19: 10,
  21: 10,
  23: 10,
};

const SYSTEM = `You are an Israeli internal-medicine board examiner writing HIGH-YIELD, board-level MCQs for the P0064-2025 Shlav-Alef internal-medicine exam. Source of truth: Harrison's Principles of Internal Medicine, 22nd edition.

Hard constraints for every question:
- Clinical-vignette stem (patient age, sex, the pertinent history / vitals / labs). Hebrew.
- EXACTLY 4 options, EXACTLY ONE correct. Options are plain Hebrew text with NO letter prefix (do NOT write "aleph.", "1.", "A." — just the option text).
- High-yield + board-level difficulty: tests a specific threshold, first-line drug, diagnostic criterion, or the discriminator between two near-miss diagnoses — the kind of decision a Shlav-Alef examiner actually tests. Not trivial recall.
- Each question must hinge on a concrete number, threshold, criterion, drug, or guideline (a specific score cutoff, a first-line agent, a dose, a 2023/2024 society guideline).
- Explanation ("e") in HEBREW, 2-4 sentences: state WHY the correct answer is correct (open with the Hebrew phrase meaning "the correct answer is ... because"), then add the teaching point, then cite the specific Harrison 22e chapter.
- "ref": a short Latin citation string, e.g. "Harrison 22e Ch 265 (Heart Failure)".
- Do NOT reuse a classic stem verbatim; vary the vignette. No Chinese/Japanese/Korean characters anywhere.

Output ONLY a JSON array (no prose, no markdown fence), each element:
{"q":"<Hebrew vignette>","o":["<opt1>","<opt2>","<opt3>","<opt4>"],"c":<0-3 index of the correct option>,"e":"<Hebrew explanation + Harrison citation>","ref":"Harrison 22e Ch N (Title)"}`;

// ----------------------------- args -----------------------------
const argv = process.argv.slice(2);
const getArg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
};
const DRY = argv.includes('--dry-run');

let plan = { ...DEFAULT_PLAN };
const planArg = getArg('plan');
if (planArg) {
  plan = {};
  for (const pair of planArg.split(',')) {
    const [ti, n] = pair.split(':').map((x) => parseInt(x.trim(), 10));
    if (Number.isInteger(ti) && Number.isInteger(n)) plan[ti] = n;
  }
}
const onlyArg = getArg('only');
if (onlyArg) {
  const keep = new Set(onlyArg.split(',').map((x) => parseInt(x.trim(), 10)));
  plan = Object.fromEntries(Object.entries(plan).filter(([ti]) => keep.has(Number(ti))));
}

// ----------------------------- helpers -----------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Strip CJK, zero-width, BIDI-control noise, and stray markdown — keep Hebrew/Latin/digits/punct.
// ASCII \u-escaped ranges only (robust to formatters/encoding round-trips).
const CJK = /[　-〿぀-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/g;
const ZW = /[​-‏‪-‮⁠-⁯﻿]/g;
function clean(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(CJK, '')
    .replace(ZW, '')
    .replace(/```[a-z]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
// Defensive: drop a leading "aleph.", "1.", "A)" style option prefix if the model added one.
const PREFIX = /^\s*(?:[א-ת]|[A-Da-d]|[1-4])\s*[.)׃:․-]\s+/;
function stripPrefix(s) {
  return String(s).replace(PREFIX, '').trim();
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Validate + normalize one raw LLM question into bank schema, or return null to drop it.
function normalize(raw, ti) {
  if (!raw || typeof raw !== 'object') return null;
  const q = clean(raw.q);
  const o = Array.isArray(raw.o) ? raw.o.map((x) => stripPrefix(clean(x))) : null;
  const e = clean(raw.e);
  const ref = clean(raw.ref) || `Harrison 22e (ti=${ti})`;
  let c = Number(raw.c);
  if (!q || !o || o.length !== 4 || o.some((x) => !x) || !e || e.length < 20) return null;
  if (!Number.isInteger(c) || c < 0 || c > 3) return null;
  if (new Set(o.map((x) => x.toLowerCase())).size !== 4) return null; // reject dup options

  // Shuffle answer slots, tracking the correct option's TEXT through the shuffle.
  const correctText = o[c];
  shuffleInPlace(o);
  c = o.indexOf(correctText);
  if (c < 0) return null;
  return { q, o, c, c_accept: [c], e, t: TAG, ti, ref };
}

async function callProxy(userPrompt, retries = 4) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  };
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'x-api-secret': SECRET, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep((attempt + 1) * 2000);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`proxy ${res.status}: ${(await res.text()).slice(0, 200)}`);
        break;
      }
      const data = await res.json();
      return (data.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
    } catch (e) {
      lastErr = e;
      await sleep((attempt + 1) * 1000);
    }
  }
  throw lastErr || new Error('proxy call failed');
}

function parseArray(text) {
  const cleaned = String(text)
    .replace(/```json|```/g, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('no JSON array in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function genTopic(ti, target, seenPrefixes, accepted) {
  const name = TOPICS[ti];
  let made = 0,
    calls = 0;
  while (made < target && calls < Math.ceil(target / BATCH) + 3) {
    calls++;
    const n = Math.min(BATCH, target - made);
    const prompt = `Generate ${n} DISTINCT high-yield board MCQs on the internal-medicine topic "${name}" (topic index ti=${ti}). Vary subtopics within it; avoid near-duplicate stems. Output only the JSON array of ${n} questions.`;
    let arr;
    try {
      arr = parseArray(await callProxy(prompt));
    } catch (e) {
      process.stderr.write(`  [ti=${ti} ${name}] call ${calls} x ${e.message}\n`);
      continue;
    }
    for (const raw of arr) {
      if (made >= target) break;
      const norm = normalize(raw, ti);
      if (!norm) continue;
      const pfx = norm.q.slice(0, 80).toLowerCase();
      if (seenPrefixes.has(pfx)) continue;
      seenPrefixes.add(pfx);
      accepted.push(norm);
      made++;
    }
    process.stderr.write(`  [ti=${ti} ${name}] ${made}/${target}\n`);
  }
  return made;
}

// bounded-concurrency pool over topics
async function runPool(tasks, n) {
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const t = tasks[i++];
      await t();
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
}

// ----------------------------- main -----------------------------
(async () => {
  const bank = JSON.parse(readFileSync(join(ROOT, 'data/questions.json'), 'utf8'));
  const seenPrefixes = new Set(bank.map((q) => String(q.q).slice(0, 80).toLowerCase()));

  let accepted = [];
  if (existsSync(OUT)) {
    accepted = JSON.parse(readFileSync(OUT, 'utf8'));
    for (const q of accepted) seenPrefixes.add(String(q.q).slice(0, 80).toLowerCase());
    process.stderr.write(`[gen] resuming with ${accepted.length} already-generated Qs in ${OUT}\n`);
  }

  // already-have counts per ti (so resume tops up toward target)
  const have = {};
  for (const q of accepted) have[q.ti] = (have[q.ti] || 0) + 1;

  const planEntries = Object.entries(plan)
    .map(([ti, n]) => [Number(ti), n])
    .filter(([ti]) => ti >= 0 && ti <= TI_MAX);
  const totalTarget = planEntries.reduce((a, [, n]) => a + n, 0);
  process.stderr.write(
    `[gen] model=${MODEL} tag=${TAG} topics=${planEntries.length} target=${totalTarget} (have ${accepted.length})\n`,
  );
  for (const [ti, n] of planEntries)
    process.stderr.write(`        ti=${ti} ${TOPICS[ti]}: target ${n} (have ${have[ti] || 0})\n`);
  if (DRY) {
    process.stderr.write('[gen] --dry-run, nothing called.\n');
    return;
  }

  const tasks = planEntries.map(([ti, n]) => async () => {
    const remaining = n - (have[ti] || 0);
    if (remaining > 0) await genTopic(ti, remaining, seenPrefixes, accepted);
  });
  await runPool(tasks, CONCURRENCY);

  writeFileSync(OUT, JSON.stringify(accepted, null, 2) + '\n', 'utf8');
  const byTi = {};
  for (const q of accepted) byTi[q.ti] = (byTi[q.ti] || 0) + 1;
  process.stderr.write(`\n[gen] wrote ${accepted.length} Qs to ${OUT}\n`);
  process.stderr.write(`[gen] per-ti: ${JSON.stringify(byTi)}\n`);
  process.stderr.write(
    '[gen] NEXT: node scripts/verify_questions.mjs data/highyield.generated.json  (key<->explanation judge)\n',
  );
  process.stderr.write(
    '[gen]       node scripts/audit_keys_blind.mjs data/highyield.generated.json (blind board-evidence audit)\n',
  );
})();
