#!/usr/bin/env node
// audit_keys_blind.mjs — INDEPENDENT, KEY-BLIND board-evidence audit of generated MCQ keys.
//
// This is the "skeptical second-model pass" required before any AI-authored exam key ships.
// It is deliberately DIFFERENT from verify_questions.mjs (which shows the key and checks that
// the EXPLANATION is consistent with it — a self-consistency check). Here the auditor model is
// shown ONLY the question stem + options — NOT the key, NOT the explanation — and must pick the
// answer itself from board-level evidence (Harrison 22e + society guidelines), then state its
// confidence. We THEN compare its blind pick to the keyed answer and FLAG:
//   - any disagreement (blind pick not in the keyed accepted set), or
//   - any confidence < 85.
// Showing the model the key and asking "do you agree?" would anchor it — so we never do that.
//
// READ-ONLY: this script NEVER edits the question file. It writes a JSON audit report; the
// merge step holds flagged questions OUT of the PR for human (Eias) review.
//
// Model: opus (independent judgment) via the Toranot proxy. temperature 0.
//
// Usage:
//   node scripts/audit_keys_blind.mjs data/highyield.generated.json
//   node scripts/audit_keys_blind.mjs data/highyield.generated.json --report out.json --limit 20

import fs from 'node:fs';

const PROXY_URL = process.env.TORANOT_URL || 'https://toranot.netlify.app/api/claude';
const SECRET = process.env.TORANOT_API_SECRET;
if (!SECRET) {
  console.error('Set TORANOT_API_SECRET (the Toranot proxy x-api-secret) to run this script.');
  process.exit(2);
}
const MODEL = process.env.AUDIT_MODEL || 'opus';
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY || 5);
const CONF_THRESHOLD = Number(process.env.AUDIT_CONF || 85);

const EXAMINER =
  'a board-certified internist serving as an independent answer-key auditor for an Israeli internal-medicine board exam (Shlav Alef). Use current board-level evidence: Harrison 22e and major society guidelines';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const reportArg = args.find((a) => a.startsWith('--report'));
const REPORT = reportArg
  ? reportArg.split('=')[1] || args[args.indexOf(reportArg) + 1]
  : file
    ? file.replace(/\.json$/, '') + '.blindaudit.json'
    : null;
const limitArg = args.find((a) => a.startsWith('--limit'));
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1]) : null;

if (!file) {
  console.error(
    'usage: node scripts/audit_keys_blind.mjs <file.json> [--report out.json] [--limit N]',
  );
  process.exit(2);
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYS = [
  `You are ${EXAMINER}.`,
  'You will be shown ONLY a question stem and its lettered options — you are NOT shown the answer key or any explanation.',
  'Independently decide which SINGLE option is the correct, unambiguously-best board answer.',
  'Then rate your confidence (0-100) that your chosen answer is the correct board answer.',
  'Reply with STRICT JSON only, no prose: {"answer":"<single letter A-F>","confidence":<0-100 integer>,"rationale":"<one short English sentence>"}',
].join(' ');

function buildUser(q) {
  const opts = q.o.map((o, i) => `${LETTERS[i]}. ${o}`).join('\n');
  return `QUESTION:\n${q.q}\n\nOPTIONS:\n${opts}\n\nWhich single option is the correct board answer? Strict JSON only.`;
}

function parseVerdict(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (typeof o.answer !== 'string') return null;
    return o;
  } catch {
    return null;
  }
}

async function judge(q, retries = 4) {
  const body = {
    model: MODEL,
    max_tokens: 400,
    temperature: 0,
    system: SYS,
    messages: [{ role: 'user', content: buildUser(q) }],
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
        await sleep((attempt + 1) * 1500);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`proxy ${res.status}: ${(await res.text()).slice(0, 160)}`);
        break;
      }
      const data = await res.json();
      const text = (data.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
      const v = parseVerdict(text);
      if (!v) {
        lastErr = new Error('unparseable: ' + text.slice(0, 120));
        continue;
      }
      return v;
    } catch (e) {
      lastErr = e;
      await sleep((attempt + 1) * 800);
    }
  }
  return { __abstain: true, __err: String((lastErr && lastErr.message) || lastErr) };
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if ((i + 1) % 25 === 0) process.stderr.write(`  audited ${i + 1}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

(async () => {
  const all = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(all)) {
    console.error('file is not a JSON array');
    process.exit(2);
  }
  const subset = LIMIT != null ? all.slice(0, LIMIT) : all;
  console.error(
    `[blind-audit] auditing ${subset.length}/${all.length} keys, model=${MODEL}, conf-threshold=${CONF_THRESHOLD}`,
  );

  const verdicts = await mapPool(subset, CONCURRENCY, (q) => judge(q));

  const results = [];
  let agreed = 0,
    disagree = 0,
    lowconf = 0,
    abstains = 0,
    flagged = 0;
  verdicts.forEach((v, i) => {
    const q = subset[i];
    const accepted = (Array.isArray(q.c_accept) && q.c_accept.length ? q.c_accept : [q.c]).filter(
      (x) => Number.isInteger(x),
    );
    const acceptedLetters = accepted.map((x) => LETTERS[x]);
    if (v.__abstain) {
      abstains++;
      flagged++;
      results.push({
        i,
        ti: q.ti,
        blind: null,
        key: acceptedLetters,
        agree: null,
        confidence: null,
        flag: true,
        reason: 'audit-abstain',
        rationale: v.__err,
        q: String(q.q).slice(0, 90),
      });
      return;
    }
    const blindLetter = String(v.answer || '')
      .trim()
      .toUpperCase()
      .slice(0, 1);
    const blindIdx = LETTERS.indexOf(blindLetter);
    const conf = Number(v.confidence);
    const agree = accepted.includes(blindIdx);
    const lc = Number.isFinite(conf) && conf < CONF_THRESHOLD;
    const flag = !agree || lc;
    if (agree) agreed++;
    else disagree++;
    if (lc) lowconf++;
    if (flag) flagged++;
    const reason = !agree ? (lc ? 'disagree+lowconf' : 'disagree') : lc ? 'lowconf' : 'ok';
    results.push({
      i,
      ti: q.ti,
      blind: blindLetter,
      key: acceptedLetters,
      agree,
      confidence: Number.isFinite(conf) ? conf : null,
      flag,
      reason,
      rationale: String(v.rationale || '').slice(0, 220),
      q: String(q.q).slice(0, 90),
    });
  });

  const summary = {
    file,
    model: MODEL,
    conf_threshold: CONF_THRESHOLD,
    total: subset.length,
    agreed,
    disagree,
    lowconf,
    abstains,
    flagged,
    flagged_indices: results.filter((r) => r.flag).map((r) => r.i),
  };
  console.error(
    `\n[blind-audit] total=${summary.total} agreed=${agreed} disagree=${disagree} lowconf=${lowconf} abstains=${abstains} FLAGGED=${flagged} (${((flagged / summary.total) * 100).toFixed(1)}%)`,
  );
  if (flagged) {
    console.error('[blind-audit] flagged samples:');
    results
      .filter((r) => r.flag)
      .slice(0, 12)
      .forEach((r) =>
        console.error(
          `  #${r.i} ti=${r.ti} key=${r.key} blind=${r.blind} conf=${r.confidence} ${r.reason} :: ${r.q}`,
        ),
      );
  }
  if (REPORT) {
    fs.writeFileSync(REPORT, JSON.stringify({ summary, results }, null, 2) + '\n', 'utf8');
    console.error(`[blind-audit] report -> ${REPORT}`);
  }
  // exit 0 always — this is an advisory audit; the merge step consumes the report.
})();
