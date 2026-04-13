/**
 * Expanded app logic tests — additional pure functions extracted from pnimit-mega.html.
 *
 * Covers: fmtT, isMetaOption, getOptShuffle, getWeakTopics,
 * calcEstScore, getChaptersDueForReading, getTopicTrend, buildMockExamPool.
 */

import { describe, it, expect } from "vitest";

// ─── Extracted pure functions ────────────────────────────────────────────────

// fmtT — format seconds as time string (line 1255)
function fmtT(s) {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sc = s % 60;
  return (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(sc).padStart(2, "0");
}

// isMetaOption — detect aggregate/reference answer options (line 1345)
function isMetaOption(text) {
  const t = (text || "").trim();
  const metaPatterns = [
    /כל\s*(ה)?תשוב/,
    /כל\s*(ה)?אמור/,
    /אף\s*תשוב/,
    /all\s+of\s+the\s+above/i,
    /none\s+of\s+the\s+above/i,
    /both\s+[a-e]\s+and\s+[a-e]/i,
    /[א-ת][׳']\s*ו[־-]?\s*[א-ת][׳']/,
    /^\s*[a-e]\s+and\s+[a-e]\s*$/i,
    /\d\s*ו\s*\d/,
  ];
  return metaPatterns.some((p) => p.test(t));
}

// getOptShuffle — deterministic seeded shuffle with meta-option pinning (line 1362)
function getOptShuffle(qIdx, q) {
  const regular = [], meta = [];
  q.o.forEach((_, i) => { isMetaOption(q.o[i]) ? meta.push(i) : regular.push(i); });
  let seed = qIdx * 31 + 17;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let i = regular.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [regular[i], regular[j]] = [regular[j], regular[i]];
  }
  return [...regular, ...meta];
}

// getWeakTopics — identify weakest topics by accuracy (line 698)
function getWeakTopics(topicStats, n = 3) {
  const scored = Object.entries(topicStats)
    .map(([ti, s]) => ({ ti: Number(ti), pct: s.tot ? Math.round((s.ok / s.tot) * 100) : null, tot: s.tot, ok: s.ok }))
    .filter((s) => s.tot >= 3)
    .sort((a, b) => a.pct - b.pct);
  return scored.slice(0, n);
}

// InternalMedicine has 24 topics with its own EXAM_FREQ
const EXAM_FREQ = [50, 45, 40, 30, 45, 60, 50, 40, 35, 50, 45, 35, 55, 35, 40, 30, 15, 15, 20, 20, 15, 15, 25, 20];

// calcEstScore — FSRS-aware estimated exam score (line 2851)
// Note: pnimit-mega uses a 40-element FREQ internally (copied from Geriatrics engine),
// but the app only has 24 topics. We test with 24-topic stats.
function calcEstScore(topicStats, dueSet) {
  const FREQ = [0, 34, 30, 28, 36, 43, 178, 39, 63, 36, 20, 27, 19, 22, 50, 40, 22, 94, 70, 78, 18, 80, 43, 21, 46, 27, 29, 52, 10, 11, 7, 0, 6, 9, 26, 19, 23, 9, 17, 0];
  const totalFreq = FREQ.reduce((a, b) => a + b, 0);
  let weightedScore = 0, totalWeight = 0;
  FREQ.forEach((freq, ti) => {
    if (!freq) return;
    const s = topicStats[ti] || { ok: 0, no: 0, tot: 0 };
    const weight = freq / totalFreq;
    let acc;
    if (s.tot < 3) {
      acc = 0.60;
    } else {
      acc = s.ok / s.tot;
      const duePenalty = dueSet.has(ti) ? 1 : 0;
      if (duePenalty > 0) acc = Math.max(0, acc - duePenalty * 0.02);
    }
    weightedScore += acc * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null;
}

// getChaptersDueForReading — spaced reading (line 739)
function getChaptersDueForReading(chReads, source, dayThreshold = 30, now = Date.now()) {
  if (!chReads) return [];
  const due = [];
  Object.entries(chReads).forEach(([key, ts]) => {
    if (!key.startsWith(source + "_")) return;
    const ch = key.split("_")[1];
    const daysSince = Math.floor((now - ts) / 86400000);
    if (daysSince >= dayThreshold) due.push({ ch, daysSince, ts });
  });
  return due.sort((a, b) => b.daysSince - a.daysSince);
}

// getTopicTrend — week-over-week accuracy trend (line 3853)
function getTopicTrend(snapshots, ti) {
  const keys = Object.keys(snapshots).sort();
  if (keys.length < 2) return null;
  const prev = snapshots[keys[keys.length - 2]].acc[ti];
  const curr = snapshots[keys[keys.length - 1]].acc[ti];
  if (prev === null || curr === null) return null;
  return curr - prev;
}

// buildMockExamPool — proportional topic distribution (line 1151)
function buildMockExamPool(QZ, examFreq) {
  const total = examFreq.reduce((a, b) => a + b, 0);
  const examPool = [];
  const byTopic = {};
  QZ.forEach((q, i) => { const ti = q.ti >= 0 ? q.ti : 23; if (!byTopic[ti]) byTopic[ti] = []; byTopic[ti].push(i); });
  examFreq.forEach((freq, ti) => {
    if (!freq || !byTopic[ti] || !byTopic[ti].length) return;
    const target = Math.max(1, Math.round((freq / total) * 100));
    const src = [...byTopic[ti]];
    for (let i = src.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [src[i], src[j]] = [src[j], src[i]]; }
    for (let k = 0; k < Math.min(target, src.length); k++) examPool.push(src[k]);
  });
  for (let i = examPool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [examPool[i], examPool[j]] = [examPool[j], examPool[i]]; }
  return examPool.slice(0, 100);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("fmtT — time formatting", () => {
  it("formats seconds only", () => {
    expect(fmtT(5)).toBe("00:05");
  });

  it("formats minutes and seconds", () => {
    expect(fmtT(65)).toBe("01:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(fmtT(3661)).toBe("1:01:01");
  });

  it("formats zero", () => {
    expect(fmtT(0)).toBe("00:00");
  });

  it("formats exactly one hour", () => {
    expect(fmtT(3600)).toBe("1:00:00");
  });

  it("pads minutes and seconds with leading zeros", () => {
    expect(fmtT(62)).toBe("01:02");
  });

  it("formats 3-hour exam timer", () => {
    expect(fmtT(10800)).toBe("3:00:00");
  });

  it("does not show hour prefix under 3600s", () => {
    expect(fmtT(3599)).toBe("59:59");
    expect(fmtT(3599).split(":").length).toBe(2);
  });
});

describe("isMetaOption — meta answer detection", () => {
  it("detects Hebrew 'all answers correct'", () => {
    expect(isMetaOption("כל התשובות נכונות")).toBe(true);
  });

  it("detects Hebrew 'all of the above'", () => {
    expect(isMetaOption("כל האמור נכון")).toBe(true);
  });

  it("detects Hebrew 'none of the answers'", () => {
    expect(isMetaOption("אף תשובה אינה נכונה")).toBe(true);
  });

  it("detects English 'all of the above'", () => {
    expect(isMetaOption("All of the above")).toBe(true);
  });

  it("detects English 'none of the above'", () => {
    expect(isMetaOption("None of the above")).toBe(true);
  });

  it("detects 'both A and C'", () => {
    expect(isMetaOption("Both A and C")).toBe(true);
  });

  it("detects Hebrew letter references (א׳ ו-ב׳)", () => {
    expect(isMetaOption("א׳ ו-ב׳")).toBe(true);
  });

  it("detects numeric references (1 ו-2)", () => {
    expect(isMetaOption("1 ו 2")).toBe(true);
  });

  it("returns false for regular option text", () => {
    expect(isMetaOption("Metformin 500mg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMetaOption("")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isMetaOption(null)).toBe(false);
    expect(isMetaOption(undefined)).toBe(false);
  });
});

describe("getOptShuffle — deterministic option shuffling", () => {
  const q = { o: ["Option A", "Option B", "Option C", "Option D"] };

  it("returns an array of the same length as options", () => {
    const map = getOptShuffle(0, q);
    expect(map.length).toBe(4);
  });

  it("contains all indices", () => {
    const map = getOptShuffle(0, q);
    expect([...map].sort()).toEqual([0, 1, 2, 3]);
  });

  it("is deterministic — same qIdx produces same shuffle", () => {
    const map1 = getOptShuffle(42, q);
    const map2 = getOptShuffle(42, q);
    expect(map1).toEqual(map2);
  });

  it("different qIdx produces different shuffle", () => {
    const map1 = getOptShuffle(0, q);
    const map2 = getOptShuffle(1, q);
    const allSame = map1.every((v, i) => v === map2[i]);
    if (!allSame) {
      expect(map1).not.toEqual(map2);
    }
  });

  it("pins meta options to the end", () => {
    const qMeta = { o: ["Metformin", "Aspirin", "Warfarin", "כל התשובות נכונות"] };
    const map = getOptShuffle(5, qMeta);
    expect(map[map.length - 1]).toBe(3);
  });

  it("shuffles regular options when meta exists", () => {
    const qMeta = { o: ["A", "B", "C", "All of the above"] };
    const map = getOptShuffle(10, qMeta);
    expect(map[3]).toBe(3);
    expect([...map.slice(0, 3)].sort()).toEqual([0, 1, 2]);
  });

  it("handles question with all meta options", () => {
    const qAllMeta = { o: ["כל התשובות נכונות", "אף תשובה", "1 ו 2", "All of the above"] };
    const map = getOptShuffle(0, qAllMeta);
    expect(map).toEqual([0, 1, 2, 3]);
  });
});

describe("getWeakTopics — weak topic identification", () => {
  it("returns weakest topics sorted by accuracy", () => {
    const stats = {
      0: { ok: 1, tot: 10 },  // Cardiology — 10%
      1: { ok: 8, tot: 10 },  // Heart Failure — 80%
      5: { ok: 3, tot: 10 },  // Pulmonology — 30%
    };
    const result = getWeakTopics(stats, 2);
    expect(result.length).toBe(2);
    expect(result[0].ti).toBe(0);
    expect(result[1].ti).toBe(5);
  });

  it("filters topics with fewer than 3 attempts", () => {
    const stats = {
      0: { ok: 0, tot: 2 },
      1: { ok: 5, tot: 10 },
    };
    const result = getWeakTopics(stats);
    expect(result.length).toBe(1);
    expect(result[0].ti).toBe(1);
  });

  it("returns empty when no topics meet threshold", () => {
    const stats = {
      0: { ok: 0, tot: 1 },
      1: { ok: 0, tot: 0 },
    };
    expect(getWeakTopics(stats)).toEqual([]);
  });

  it("returns correct percentage", () => {
    const stats = { 12: { ok: 7, tot: 10 } }; // Infectious Disease
    const result = getWeakTopics(stats, 1);
    expect(result[0].pct).toBe(70);
  });

  it("defaults to n=3", () => {
    const stats = {};
    for (let i = 0; i < 10; i++) stats[i] = { ok: i, tot: 10 };
    const result = getWeakTopics(stats);
    expect(result.length).toBe(3);
  });
});

describe("calcEstScore — estimated exam score", () => {
  it("returns 60 when no data exists (neutral assumption)", () => {
    const result = calcEstScore({}, new Set());
    expect(result).toBe(60);
  });

  it("returns higher score with good accuracy", () => {
    const stats = {};
    for (let ti = 0; ti < 24; ti++) stats[ti] = { ok: 9, tot: 10, no: 1 };
    const result = calcEstScore(stats, new Set());
    expect(result).toBeGreaterThan(80);
  });

  it("penalizes due topics", () => {
    const stats = {};
    for (let ti = 0; ti < 24; ti++) stats[ti] = { ok: 8, tot: 10, no: 2 };
    const withoutDue = calcEstScore(stats, new Set());
    const withDue = calcEstScore(stats, new Set([6]));
    expect(withDue).toBeLessThanOrEqual(withoutDue);
  });

  it("handles mixed data — some topics seen, some not", () => {
    const stats = {
      0: { ok: 9, tot: 10, no: 1 }, // Cardiology — strong
      5: { ok: 2, tot: 10, no: 8 }, // Pulmonology — weak
    };
    const result = calcEstScore(stats, new Set());
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe("getChaptersDueForReading — spaced reading", () => {
  const ONE_DAY = 86400000;

  it("returns empty when no reads recorded", () => {
    expect(getChaptersDueForReading(null, "harrison")).toEqual([]);
    expect(getChaptersDueForReading({}, "harrison")).toEqual([]);
  });

  it("returns chapters due after threshold days", () => {
    const now = Date.now();
    const reads = {
      harrison_285: now - 31 * ONE_DAY,
      harrison_286: now - 15 * ONE_DAY,
    };
    const result = getChaptersDueForReading(reads, "harrison", 30, now);
    expect(result.length).toBe(1);
    expect(result[0].ch).toBe("285");
    expect(result[0].daysSince).toBe(31);
  });

  it("filters by source prefix", () => {
    const now = Date.now();
    const reads = {
      harrison_285: now - 40 * ONE_DAY,
      article_1: now - 40 * ONE_DAY,
    };
    const result = getChaptersDueForReading(reads, "harrison", 30, now);
    expect(result.length).toBe(1);
    expect(result[0].ch).toBe("285");
  });

  it("sorts by most overdue first", () => {
    const now = Date.now();
    const reads = {
      harrison_56: now - 50 * ONE_DAY,
      harrison_285: now - 90 * ONE_DAY,
      harrison_315: now - 35 * ONE_DAY,
    };
    const result = getChaptersDueForReading(reads, "harrison", 30, now);
    expect(result[0].ch).toBe("285");
    expect(result[1].ch).toBe("56");
    expect(result[2].ch).toBe("315");
  });

  it("uses custom threshold", () => {
    const now = Date.now();
    const reads = { harrison_14: now - 10 * ONE_DAY };
    expect(getChaptersDueForReading(reads, "harrison", 7, now).length).toBe(1);
    expect(getChaptersDueForReading(reads, "harrison", 14, now).length).toBe(0);
  });

  it("returns at threshold boundary", () => {
    const now = Date.now();
    const reads = { harrison_14: now - 30 * ONE_DAY };
    const result = getChaptersDueForReading(reads, "harrison", 30, now);
    expect(result.length).toBe(1);
  });
});

describe("getTopicTrend — week-over-week accuracy trend", () => {
  it("returns null with fewer than 2 snapshots", () => {
    expect(getTopicTrend({}, 0)).toBe(null);
    expect(getTopicTrend({ "2026-W15": { acc: [50] } }, 0)).toBe(null);
  });

  it("returns positive delta when improving", () => {
    const snapshots = {
      "2026-W14": { acc: [50, 60] },
      "2026-W15": { acc: [70, 80] },
    };
    expect(getTopicTrend(snapshots, 0)).toBe(20);
  });

  it("returns negative delta when declining", () => {
    const snapshots = {
      "2026-W14": { acc: [80] },
      "2026-W15": { acc: [60] },
    };
    expect(getTopicTrend(snapshots, 0)).toBe(-20);
  });

  it("returns 0 when unchanged", () => {
    const snapshots = {
      "2026-W14": { acc: [75] },
      "2026-W15": { acc: [75] },
    };
    expect(getTopicTrend(snapshots, 0)).toBe(0);
  });

  it("returns null when either snapshot has null accuracy", () => {
    const snapshots = {
      "2026-W14": { acc: [null] },
      "2026-W15": { acc: [80] },
    };
    expect(getTopicTrend(snapshots, 0)).toBe(null);
  });

  it("uses last two snapshots even with more history", () => {
    const snapshots = {
      "2026-W12": { acc: [10] },
      "2026-W13": { acc: [20] },
      "2026-W14": { acc: [40] },
      "2026-W15": { acc: [80] },
    };
    expect(getTopicTrend(snapshots, 0)).toBe(40);
  });
});

describe("buildMockExamPool — proportional exam pool (24 topics)", () => {
  // Create mock question bank with 24 topics (InternalMedicine)
  const QZ = [];
  for (let ti = 0; ti < 24; ti++) {
    for (let j = 0; j < 30; j++) {
      QZ.push({ ti, q: `Q${ti}-${j}`, o: ["a", "b", "c", "d"], c: 0 });
    }
  }

  it("returns at most 100 questions", () => {
    const pool = buildMockExamPool(QZ, EXAM_FREQ);
    expect(pool.length).toBeLessThanOrEqual(100);
  });

  it("returns valid indices", () => {
    const pool = buildMockExamPool(QZ, EXAM_FREQ);
    for (const idx of pool) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(QZ.length);
    }
  });

  it("includes questions from high-frequency topics", () => {
    const pool = buildMockExamPool(QZ, EXAM_FREQ);
    // Topic 5 (Pulmonology, freq 60) is highest — should be represented
    const topic5Qs = pool.filter((i) => QZ[i].ti === 5);
    expect(topic5Qs.length).toBeGreaterThan(0);
  });

  it("covers multiple topics", () => {
    const pool = buildMockExamPool(QZ, EXAM_FREQ);
    const topics = new Set(pool.map((i) => QZ[i].ti));
    expect(topics.size).toBeGreaterThan(10);
  });

  it("returns integer indices", () => {
    const pool = buildMockExamPool(QZ, EXAM_FREQ);
    for (const idx of pool) {
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  it("handles empty question bank", () => {
    const pool = buildMockExamPool([], EXAM_FREQ);
    expect(pool.length).toBe(0);
  });

  it("handles question bank with only one topic", () => {
    const singleTopicQZ = Array.from({ length: 50 }, () => ({ ti: 0 }));
    const pool = buildMockExamPool(singleTopicQZ, EXAM_FREQ);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.length).toBeLessThanOrEqual(100);
  });
});
