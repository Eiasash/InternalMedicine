/**
 * App logic tests — pure functions extracted from pnimit-mega.html.
 *
 * Since the app is a single HTML monolith, we copy the pure functions
 * here and test them in isolation. vitest.config.js sets globals: true.
 */

// ─── FSRS-4.5 constants (from pnimit-mega.html) ─────────────────────────────

const FSRS_W = [
  0.40255, 1.18385, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.06362,
  1.544, 0.1544, 1.0070, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  0.51655, 0.6621,
];
const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;
const FSRS_RETENTION = 0.90;

// ─── Extracted pure functions ─────────────────────────────────────────────────

function fsrsR(t, s) {
  if (!s || s <= 0) return 0;
  return Math.pow(1 + FSRS_FACTOR * t / s, FSRS_DECAY);
}

function fsrsInterval(s) {
  return Math.max(1, Math.round(s / FSRS_FACTOR * (Math.pow(FSRS_RETENTION, 1 / FSRS_DECAY) - 1)));
}

function fsrsInitNew(rating) {
  const r = Math.max(0, Math.min(3, rating - 1));
  const s = Math.max(0.1, FSRS_W[r]);
  const d = Math.min(10, Math.max(1, FSRS_W[4] - Math.exp(FSRS_W[5] * r) + 1));
  return { s, d };
}

function fsrsUpdate(s, d, rPrev, rating) {
  let newS, newD;
  if (rating === 1) {
    newS = FSRS_W[11] * Math.pow(Math.max(0.1, d), -FSRS_W[12]) *
      (Math.pow(s + 1, FSRS_W[13]) - 1) *
      Math.exp(FSRS_W[14] * (1 - rPrev));
    newS = Math.max(0.1, newS);
  } else {
    const hard = rating === 2 ? FSRS_W[15] : 1;
    const easy = rating === 4 ? FSRS_W[16] : 1;
    newS = s * (Math.exp(FSRS_W[8]) * (11 - d) *
      Math.pow(Math.max(0.01, s), -FSRS_W[9]) *
      (Math.exp(FSRS_W[10] * (1 - rPrev)) - 1) *
      hard * easy + 1);
    newS = Math.max(0.1, newS);
  }
  const deltaD = -FSRS_W[6] * (rating - 3);
  const mr = FSRS_W[7] * (FSRS_W[4] - d);
  newD = Math.min(10, Math.max(1, d + deltaD + mr));
  return { s: newS, d: newD };
}

function fsrsMigrateFromSM2(sm2entry) {
  const daysLeft = Math.max(0, (sm2entry.next - Date.now()) / 86400000);
  const s = Math.max(0.1, daysLeft > 0 ? daysLeft : sm2entry.n || 0.1);
  const d = Math.min(10, Math.max(1, Math.round((2.5 - sm2entry.ef) / (2.5 - 1.3) * 9 + 1)));
  return { s, d };
}

function isChronicFail(sr, qIdx) {
  const s = sr[qIdx];
  if (!s) return false;
  const lowAccuracy = s.tot >= 4 && s.ok / s.tot < 0.35;
  const highDifficulty = s.fsrsD && s.fsrsD >= 8 && s.tot >= 3;
  return lowAccuracy || highDifficulty;
}

function getDueQuestions(sr) {
  const now = Date.now();
  return Object.entries(sr).filter(([k, v]) => v.next <= now).map(([k]) => parseInt(k)).slice(0, 20);
}

function isExamTrap(sr, qIdx) {
  const s = sr[qIdx]; if (!s || !s.wc) return false;
  const totalAttempts = s.tot || 0; if (totalAttempts < 3) return false;
  const wrongValues = Object.values(s.wc);
  if (!wrongValues.length) return false;
  const maxWrong = Math.max(...wrongValues);
  return maxWrong / totalAttempts >= 0.4;
}

function sanitize(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function calcACBTotal(medBasket, DRUGS) {
  return medBasket.reduce((sum, name) => {
    const d = DRUGS.find(x => x.name === name);
    return sum + (d ? d.acb : 0);
  }, 0);
}

function getSTOPPWarnings(medBasket, DRUGS) {
  const warnings = [];
  const names = medBasket.map(n => n.toLowerCase());
  const cats = medBasket.map(n => { const d = DRUGS.find(x => x.name === n); return d ? d.cat : ''; }).filter(Boolean);
  const acDrugs = medBasket.filter(n => { const d = DRUGS.find(x => x.name === n); return d && d.acb >= 2; });
  if (acDrugs.length >= 2) warnings.push({ level: 'high', text: `Dual anticholinergic burden: ${acDrugs.join(' + ')} — cumulative cognitive/fall risk` });
  const hasBenzo = cats.some(c => c.toLowerCase().includes('benzo'));
  const hasOpioid = cats.some(c => c.toLowerCase().includes('opioid'));
  if (hasBenzo && hasOpioid) warnings.push({ level: 'high', text: 'Benzodiazepine + Opioid — respiratory depression risk' });
  const antiPlat = medBasket.filter(n => /aspirin|clopidogrel|prasugrel|ticagrelor/i.test(n));
  if (antiPlat.length >= 2) warnings.push({ level: 'med', text: `Dual antiplatelet: ${antiPlat.join(' + ')} — bleeding risk, especially with anticoagulant` });
  const hasNSAID = cats.some(c => c.toLowerCase().includes('nsaid'));
  const hasAnticoag = cats.some(c => c.toLowerCase().includes('anticoag'));
  if (hasNSAID && hasAnticoag) warnings.push({ level: 'high', text: 'NSAID + Anticoagulant — major GI bleed risk' });
  const hasACE = names.some(n => /enalapril|ramipril|lisinopril|losartan|valsartan|candesartan/i.test(n));
  const hasKsparing = names.some(n => /spironolactone|eplerenone|amiloride/i.test(n));
  if (hasACE && hasKsparing) warnings.push({ level: 'med', text: 'ACEi/ARB + K-sparing diuretic — hyperkalemia risk' });
  if (hasACE && hasNSAID) warnings.push({ level: 'med', text: 'ACEi/ARB + NSAID — AKI risk, reduced BP efficacy' });
  const hasAntiChol = medBasket.some(n => { const d = DRUGS.find(x => x.name === n); return d && d.acb >= 2; });
  const hasChEI = names.some(n => /donepezil|rivastigmine|galantamine/i.test(n));
  if (hasAntiChol && hasChEI) warnings.push({ level: 'high', text: 'Anticholinergic opposes cholinesterase inhibitor — pharmacological conflict' });
  const hasMet = names.some(n => /metformin/i.test(n));
  if (hasMet) warnings.push({ level: 'low', text: 'Metformin — verify eGFR >30; contraindicated in severe CKD' });
  const hasPPI = names.some(n => /omeprazole|pantoprazole|esomeprazole|lansoprazole/i.test(n));
  if (hasPPI) warnings.push({ level: 'low', text: 'PPI — long-term use: Mg/Ca malabsorption, C. difficile risk, consider step-down' });
  return warnings;
}

function getTopicStats(QZ, sr) {
  const st = {};
  Object.entries(sr).forEach(([idx, d]) => {
    const q = QZ[idx]; if (!q) return;
    const ti = q.ti || 0;
    if (!st[ti]) st[ti] = { ok: 0, no: 0, tot: 0 };
    st[ti].tot++;
    if (d.n > 0) st[ti].ok++; else st[ti].no++;
  });
  return st;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FSRS-4.5 — fsrsR (retrievability)", () => {
  it("returns 0 for stability <= 0", () => {
    expect(fsrsR(5, 0)).toBe(0);
    expect(fsrsR(5, -1)).toBe(0);
  });

  it("returns 1.0 at t=0 (just reviewed)", () => {
    expect(fsrsR(0, 10)).toBeCloseTo(1.0, 5);
  });

  it("decays over time", () => {
    const r1 = fsrsR(1, 10);
    const r10 = fsrsR(10, 10);
    const r30 = fsrsR(30, 10);
    expect(r1).toBeGreaterThan(r10);
    expect(r10).toBeGreaterThan(r30);
  });

  it("higher stability decays more slowly", () => {
    expect(fsrsR(10, 50)).toBeGreaterThan(fsrsR(10, 5));
  });

  it("returns value between 0 and 1 for positive inputs", () => {
    const r = fsrsR(5, 10);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

describe("FSRS-4.5 — fsrsInterval", () => {
  it("returns at least 1 day", () => {
    expect(fsrsInterval(0.1)).toBeGreaterThanOrEqual(1);
  });

  it("returns longer intervals for higher stability", () => {
    expect(fsrsInterval(50)).toBeGreaterThan(fsrsInterval(10));
    expect(fsrsInterval(10)).toBeGreaterThan(fsrsInterval(1));
  });

  it("returns an integer", () => {
    expect(Number.isInteger(fsrsInterval(5))).toBe(true);
  });

  it("handles very small stability", () => {
    expect(fsrsInterval(0.01)).toBe(1);
  });
});

describe("FSRS-4.5 — fsrsInitNew", () => {
  it("rating=1 gives lowest stability", () => {
    expect(fsrsInitNew(1).s).toBeCloseTo(Math.max(0.1, FSRS_W[0]), 4);
  });

  it("rating=4 gives highest stability", () => {
    expect(fsrsInitNew(4).s).toBeCloseTo(Math.max(0.1, FSRS_W[3]), 4);
  });

  it("stability increases with higher ratings", () => {
    const s = [1, 2, 3, 4].map(r => fsrsInitNew(r).s);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThanOrEqual(s[i - 1]);
  });

  it("difficulty is clamped between 1 and 10", () => {
    for (let r = 1; r <= 4; r++) {
      const { d } = fsrsInitNew(r);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("stability is at least 0.1", () => {
    for (let r = 1; r <= 4; r++) expect(fsrsInitNew(r).s).toBeGreaterThanOrEqual(0.1);
  });
});

describe("FSRS-4.5 — fsrsUpdate", () => {
  it("forgetting (rating=1) reduces stability", () => {
    expect(fsrsUpdate(10, 5, 0.9, 1).s).toBeLessThan(10);
  });

  it("recalling (rating=3) increases stability", () => {
    expect(fsrsUpdate(5, 5, 0.9, 3).s).toBeGreaterThan(5);
  });

  it("easy > good > hard for stability", () => {
    const hard = fsrsUpdate(5, 5, 0.9, 2).s;
    const good = fsrsUpdate(5, 5, 0.9, 3).s;
    const easy = fsrsUpdate(5, 5, 0.9, 4).s;
    expect(easy).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(hard);
  });

  it("difficulty is clamped between 1 and 10", () => {
    for (let r = 1; r <= 4; r++) {
      const { d } = fsrsUpdate(5, 5, 0.9, r);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("stability never drops below 0.1", () => {
    expect(fsrsUpdate(0.1, 10, 0.5, 1).s).toBeGreaterThanOrEqual(0.1);
  });

  it("mean reversion pulls difficulty toward center", () => {
    expect(fsrsUpdate(5, 10, 0.9, 3).d).toBeLessThan(10);
    expect(fsrsUpdate(5, 1, 0.9, 3).d).toBeGreaterThan(1);
  });
});

describe("FSRS-4.5 — fsrsMigrateFromSM2", () => {
  it("maps ef=2.5 to low difficulty", () => {
    expect(fsrsMigrateFromSM2({ ef: 2.5, n: 5, next: 0 }).d).toBe(1);
  });

  it("maps ef=1.3 to high difficulty", () => {
    expect(fsrsMigrateFromSM2({ ef: 1.3, n: 5, next: 0 }).d).toBe(10);
  });

  it("uses future review interval for stability", () => {
    const { s } = fsrsMigrateFromSM2({ ef: 2.0, n: 3, next: Date.now() + 10 * 86400000 });
    expect(s).toBeGreaterThan(9);
    expect(s).toBeLessThan(11);
  });

  it("falls back to n when no future review", () => {
    expect(fsrsMigrateFromSM2({ ef: 2.0, n: 7, next: 0 }).s).toBe(7);
  });

  it("stability is at least 0.1", () => {
    expect(fsrsMigrateFromSM2({ ef: 2.5, n: 0, next: 0 }).s).toBeGreaterThanOrEqual(0.1);
  });
});

describe("isChronicFail", () => {
  it("returns false for unknown question", () => {
    expect(isChronicFail({}, 99)).toBe(false);
  });

  it("returns false when too few attempts", () => {
    expect(isChronicFail({ 0: { tot: 2, ok: 0, fsrsD: 10 } }, 0)).toBe(false);
  });

  it("detects low accuracy (<35% with >=4 attempts)", () => {
    expect(isChronicFail({ 0: { tot: 10, ok: 3 } }, 0)).toBe(true);
  });

  it("detects high difficulty (D>=8 with >=3 attempts)", () => {
    expect(isChronicFail({ 0: { tot: 3, ok: 2, fsrsD: 9 } }, 0)).toBe(true);
  });

  it("returns false for good performance", () => {
    expect(isChronicFail({ 0: { tot: 10, ok: 8, fsrsD: 3 } }, 0)).toBe(false);
  });
});

describe("getDueQuestions", () => {
  it("returns empty when nothing due", () => {
    expect(getDueQuestions({ 0: { next: Date.now() + 86400000 } })).toEqual([]);
  });

  it("returns due questions", () => {
    const sr = { 0: { next: Date.now() - 1000 }, 1: { next: Date.now() + 86400000 }, 2: { next: Date.now() - 5000 } };
    const due = getDueQuestions(sr);
    expect(due).toContain(0);
    expect(due).toContain(2);
    expect(due).not.toContain(1);
  });

  it("caps at 20 questions", () => {
    const sr = {};
    for (let i = 0; i < 30; i++) sr[i] = { next: Date.now() - 1000 };
    expect(getDueQuestions(sr).length).toBe(20);
  });

  it("returns integers not strings", () => {
    expect(typeof getDueQuestions({ "5": { next: 0 } })[0]).toBe("number");
  });
});

describe("isExamTrap", () => {
  it("returns false with no data", () => {
    expect(isExamTrap({}, 0)).toBe(false);
  });

  it("returns false with no wrong-choice data", () => {
    expect(isExamTrap({ 0: { tot: 5 } }, 0)).toBe(false);
  });

  it("returns false with too few attempts", () => {
    expect(isExamTrap({ 0: { tot: 2, wc: { 1: 2 } } }, 0)).toBe(false);
  });

  it("detects trap (>=40% same wrong answer)", () => {
    expect(isExamTrap({ 0: { tot: 10, wc: { 2: 5 } } }, 0)).toBe(true);
  });

  it("returns false when wrong answers spread evenly", () => {
    expect(isExamTrap({ 0: { tot: 10, wc: { 1: 2, 2: 2, 3: 1 } } }, 0)).toBe(false);
  });
});

describe("sanitize", () => {
  it("escapes HTML entities", () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it("escapes ampersands", () => {
    expect(sanitize("A & B")).toBe("A &amp; B");
  });

  it("escapes single quotes", () => {
    expect(sanitize("it's")).toBe("it&#39;s");
  });

  it("handles null/undefined", () => {
    expect(sanitize(null)).toBe("");
    expect(sanitize(undefined)).toBe("");
  });

  it("handles numbers", () => {
    expect(sanitize(42)).toBe("42");
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});

describe("calcACBTotal", () => {
  const drugs = [
    { name: "Oxybutynin", acb: 3 },
    { name: "Amitriptyline", acb: 3 },
    { name: "Lisinopril", acb: 0 },
    { name: "Ranitidine", acb: 1 },
  ];

  it("returns 0 for empty basket", () => {
    expect(calcACBTotal([], drugs)).toBe(0);
  });

  it("sums ACB scores correctly", () => {
    expect(calcACBTotal(["Oxybutynin", "Amitriptyline"], drugs)).toBe(6);
  });

  it("returns 0 for unknown drugs", () => {
    expect(calcACBTotal(["UnknownDrug"], drugs)).toBe(0);
  });

  it("handles mixed known and unknown", () => {
    expect(calcACBTotal(["Oxybutynin", "UnknownDrug", "Ranitidine"], drugs)).toBe(4);
  });
});

describe("getSTOPPWarnings", () => {
  const drugs = [
    { name: "Oxybutynin", acb: 3, cat: "Anticholinergic/Bladder" },
    { name: "Amitriptyline", acb: 3, cat: "Anticholinergic/TCA" },
    { name: "Diazepam", acb: 1, cat: "Benzodiazepine" },
    { name: "Morphine", acb: 0, cat: "Opioid" },
    { name: "Aspirin", acb: 0, cat: "Antiplatelet" },
    { name: "Clopidogrel", acb: 0, cat: "Antiplatelet" },
    { name: "Ibuprofen", acb: 0, cat: "NSAID" },
    { name: "Warfarin", acb: 0, cat: "Anticoagulant" },
    { name: "Ramipril", acb: 0, cat: "ACEi" },
    { name: "Spironolactone", acb: 0, cat: "K-sparing diuretic" },
    { name: "Donepezil", acb: 0, cat: "ChEI" },
    { name: "Metformin", acb: 0, cat: "Biguanide" },
    { name: "Omeprazole", acb: 0, cat: "PPI" },
  ];

  it("returns empty for no medications", () => {
    expect(getSTOPPWarnings([], drugs)).toEqual([]);
  });

  it("detects dual anticholinergic burden", () => {
    const w = getSTOPPWarnings(["Oxybutynin", "Amitriptyline"], drugs);
    expect(w.some(x => x.text.includes("anticholinergic"))).toBe(true);
  });

  it("detects benzo + opioid", () => {
    const w = getSTOPPWarnings(["Diazepam", "Morphine"], drugs);
    expect(w.some(x => x.text.includes("Opioid"))).toBe(true);
  });

  it("detects NSAID + anticoagulant", () => {
    const w = getSTOPPWarnings(["Ibuprofen", "Warfarin"], drugs);
    expect(w.some(x => x.text.includes("GI bleed"))).toBe(true);
  });

  it("detects ACEi + K-sparing (hyperkalemia)", () => {
    const w = getSTOPPWarnings(["Ramipril", "Spironolactone"], drugs);
    expect(w.some(x => x.text.includes("hyperkalemia"))).toBe(true);
  });

  it("detects anticholinergic opposing ChEI", () => {
    const w = getSTOPPWarnings(["Oxybutynin", "Donepezil"], drugs);
    expect(w.some(x => x.text.includes("pharmacological conflict"))).toBe(true);
  });

  it("flags metformin for CKD check", () => {
    const w = getSTOPPWarnings(["Metformin"], drugs);
    expect(w.some(x => x.text.includes("eGFR"))).toBe(true);
  });

  it("flags PPI long-term use", () => {
    const w = getSTOPPWarnings(["Omeprazole"], drugs);
    expect(w.some(x => x.text.includes("PPI"))).toBe(true);
  });

  it("detects ACEi + NSAID (AKI)", () => {
    const w = getSTOPPWarnings(["Ramipril", "Ibuprofen"], drugs);
    expect(w.some(x => x.text.includes("AKI"))).toBe(true);
  });
});

describe("getTopicStats", () => {
  it("returns empty for no SR data", () => {
    expect(getTopicStats([{ ti: 0 }], {})).toEqual({});
  });

  it("counts correct and incorrect by topic", () => {
    const QZ = [{ ti: 5 }, { ti: 5 }, { ti: 3 }];
    const sr = { 0: { n: 3 }, 1: { n: 0 }, 2: { n: 1 } };
    const stats = getTopicStats(QZ, sr);
    expect(stats[5]).toEqual({ ok: 1, no: 1, tot: 2 });
    expect(stats[3]).toEqual({ ok: 1, no: 0, tot: 1 });
  });

  it("ignores SR entries without matching questions", () => {
    const stats = getTopicStats([{ ti: 0 }], { 0: { n: 1 }, 99: { n: 1 } });
    expect(stats[0]).toEqual({ ok: 1, no: 0, tot: 1 });
    expect(stats[99]).toBeUndefined();
  });

  it("handles all 24 internal medicine topics", () => {
    const QZ = Array.from({ length: 24 }, (_, i) => ({ ti: i }));
    const sr = {};
    QZ.forEach((_, i) => { sr[i] = { n: i % 2 }; });
    const stats = getTopicStats(QZ, sr);
    expect(Object.keys(stats).length).toBe(24);
  });
});


// ===== EXTRACTED FUNCTIONS FOR TESTING =====

function buildMockPool(QZ, maxSize) {
  if (!QZ || QZ.length === 0) return [];
  const indices = QZ.map((_, i) => i);
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, maxSize);
}

function calcStreak(history) {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]) streak++;
    else break;
  }
  return streak;
}

function rebuildPoolIfEmpty(pool, QZ, usedSet) {
  if (pool && pool.length > 0) return pool;
  const unused = QZ.map((_, i) => i).filter(i => !usedSet.has(i));
  return unused;
}

// ===== ADDITIONAL TESTS — PORTED FROM GERIATRICS =====

describe("buildMockPool — mock exam pool building", () => {
  it("returns empty array for empty question bank", () => {
    expect(buildMockPool([], 100)).toEqual([]);
  });

  it("builds pool with correct maximum size", () => {
    const QZ = Array.from({ length: 200 }, (_, i) => ({ ti: i % 10 }));
    const pool = buildMockPool(QZ, 100);
    expect(pool.length).toBeLessThanOrEqual(100);
  });

  it("includes questions from multiple topics (per-topic distribution)", () => {
    const QZ = [];
    for (let ti = 0; ti < 5; ti++) {
      for (let j = 0; j < 20; j++) {
        QZ.push({ ti });
      }
    }
    const pool = buildMockPool(QZ, 50);
    const topicsInPool = new Set(pool.map(idx => QZ[idx].ti));
    expect(topicsInPool.size).toBeGreaterThanOrEqual(3);
  });

  it("caps pool at requested size", () => {
    const QZ = Array.from({ length: 300 }, (_, i) => ({ ti: i % 24 }));
    const pool = buildMockPool(QZ, 150);
    expect(pool.length).toBeLessThanOrEqual(150);
  });

  it("returns indices not question objects", () => {
    const QZ = [{ ti: 0 }, { ti: 1 }, { ti: 2 }];
    const pool = buildMockPool(QZ, 3);
    pool.forEach(idx => {
      expect(typeof idx).toBe('number');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(QZ.length);
    });
  });
});

describe("calcStreak — streak calculation edge cases", () => {
  it("returns 0 for empty history", () => {
    expect(calcStreak([])).toBe(0);
  });

  it("returns 0 for null/undefined history", () => {
    expect(calcStreak(null)).toBe(0);
    expect(calcStreak(undefined)).toBe(0);
  });

  it("returns full length for all-correct streak", () => {
    expect(calcStreak([true, true, true, true])).toBe(4);
  });

  it("returns 0 when last answer is wrong", () => {
    expect(calcStreak([true, true, false])).toBe(0);
  });

  it("counts consecutive correct from end", () => {
    expect(calcStreak([false, true, true, true])).toBe(3);
    expect(calcStreak([false, false, true])).toBe(1);
  });

  it("returns 1 for single correct answer", () => {
    expect(calcStreak([true])).toBe(1);
  });

  it("returns 0 for single wrong answer", () => {
    expect(calcStreak([false])).toBe(0);
  });
});

describe("rebuildPoolIfEmpty — pool rebuilding when empty", () => {
  it("returns existing pool if non-empty", () => {
    const pool = [1, 2, 3];
    const result = rebuildPoolIfEmpty(pool, [{ ti: 0 }, { ti: 0 }], new Set());
    expect(result).toBe(pool);
  });

  it("rebuilds pool from unused questions when empty", () => {
    const QZ = [{ ti: 0 }, { ti: 1 }, { ti: 2 }, { ti: 3 }];
    const usedSet = new Set([0, 1]);
    const result = rebuildPoolIfEmpty([], QZ, usedSet);
    expect(result.length).toBe(2);
    expect(result).toContain(2);
    expect(result).toContain(3);
  });

  it("returns all indices when nothing is used", () => {
    const QZ = [{ ti: 0 }, { ti: 1 }];
    const result = rebuildPoolIfEmpty([], QZ, new Set());
    expect(result.length).toBe(2);
  });

  it("returns empty if all questions used", () => {
    const QZ = [{ ti: 0 }, { ti: 1 }];
    const result = rebuildPoolIfEmpty([], QZ, new Set([0, 1]));
    expect(result.length).toBe(0);
  });
});
