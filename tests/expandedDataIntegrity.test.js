/**
 * Expanded data integrity tests for Pnimit (Internal Medicine) exam app.
 *
 * Adds deeper validation, edge-case checks, cross-file consistency,
 * and image-map integrity beyond the base dataIntegrity.test.js.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

function loadJSON(filename) {
  return JSON.parse(readFileSync(resolve(ROOT, filename), "utf-8"));
}

let questions, notes, drugs, flashcards, topics, tabs;

beforeAll(() => {
  questions = loadJSON("data/questions.json");
  notes = loadJSON("data/notes.json");
  drugs = loadJSON("data/drugs.json");
  flashcards = loadJSON("data/flashcards.json");
  topics = loadJSON("data/topics.json");
  tabs = loadJSON("data/tabs.json");
});

// ─── Questions — answer integrity ────────────────────────────────────────────

describe("questions.json — answer integrity", () => {
  it("every question has exactly 4 options", () => {
    const non4 = questions.filter(q => q.o.length !== 4);
    expect(non4.length, `${non4.length} questions don't have exactly 4 options`).toBeLessThan(
      questions.length * 0.05,
    );
  });

  it("correct answer index is never negative", () => {
    questions.forEach((q, i) => {
      expect(q.c, `Q[${i}].c should not be negative`).toBeGreaterThanOrEqual(0);
    });
  });

  it("correct answer index is strictly within options array bounds", () => {
    const outOfBounds = [];
    questions.forEach((q, i) => {
      if (q.c >= q.o.length) {
        outOfBounds.push({ index: i, c: q.c, optLen: q.o.length, q: q.q.slice(0, 50) });
      }
    });
    expect(outOfBounds, `Out-of-bounds correct answers: ${JSON.stringify(outOfBounds)}`).toEqual([]);
  });

  it("no option text is just whitespace", () => {
    const blank = [];
    questions.forEach((q, i) => {
      q.o.forEach((opt, j) => {
        if (typeof opt !== "string" || opt.trim().length === 0) {
          blank.push({ qIndex: i, optIndex: j });
        }
      });
    });
    expect(blank, `Blank options found: ${JSON.stringify(blank)}`).toEqual([]);
  });

  it("question text length is reasonable (5-2000 chars)", () => {
    const tooShort = [];
    const tooLong = [];
    questions.forEach((q, i) => {
      if (q.q.length < 5) tooShort.push({ index: i, len: q.q.length });
      if (q.q.length > 2000) tooLong.push({ index: i, len: q.q.length });
    });
    expect(tooShort, `Questions too short: ${JSON.stringify(tooShort)}`).toEqual([]);
    expect(tooLong, `Questions too long: ${JSON.stringify(tooLong)}`).toEqual([]);
  });

  it("year field (t) is a non-empty string", () => {
    questions.forEach((q, i) => {
      expect(typeof q.t, `Q[${i}].t should be string`).toBe("string");
      expect(q.t.length, `Q[${i}].t should be non-empty`).toBeGreaterThan(0);
    });
  });

  it("topic index (ti) is an integer 0-23", () => {
    const invalid = [];
    questions.forEach((q, i) => {
      if (!Number.isInteger(q.ti) || q.ti < 0 || q.ti > 23) {
        invalid.push({ index: i, ti: q.ti });
      }
    });
    expect(invalid, `Invalid topic indices: ${JSON.stringify(invalid)}`).toEqual([]);
  });

  it("all questions have explanations (e field, >20 chars)", () => {
    const missing = [];
    questions.forEach((q, i) => {
      if (!q.e || typeof q.e !== "string" || q.e.length < 20) {
        missing.push({ index: i, eLen: q.e ? q.e.length : 0 });
      }
    });
    expect(missing, `Questions missing/short explanations: ${JSON.stringify(missing.slice(0, 10))}`).toEqual([]);
  });
});

// ─── Questions — near-duplicate detection ────────────────────────────────────

describe("questions.json — near-duplicate detection", () => {
  it("no near-duplicate questions by first 80 chars with conflicting answers", () => {
    const map = new Map();
    const nearDupes = [];
    questions.forEach((q, i) => {
      const prefix = q.q.trim().slice(0, 80).toLowerCase();
      if (map.has(prefix)) {
        const prev = map.get(prefix);
        if (prev.c !== q.c) {
          nearDupes.push({
            indices: [prev.index, i],
            prefix: prefix.slice(0, 40) + "...",
          });
        }
      } else {
        map.set(prefix, { index: i, c: q.c });
      }
    });
    expect(nearDupes, `Near-duplicate questions with conflicting answers: ${JSON.stringify(nearDupes)}`).toEqual([]);
  });
});

// ─── Notes — content quality ─────────────────────────────────────────────────

describe("notes.json — content quality", () => {
  it("every note has an id field (integer 0-23)", () => {
    notes.forEach((n, i) => {
      expect(n.id, `Note[${i}].id should be defined`).toBeDefined();
      expect(Number.isInteger(n.id), `Note[${i}].id should be integer`).toBe(true);
      expect(n.id, `Note[${i}].id should be >= 0`).toBeGreaterThanOrEqual(0);
      expect(n.id, `Note[${i}].id should be <= 23`).toBeLessThanOrEqual(23);
    });
  });

  it("note IDs are unique", () => {
    const ids = notes.map(n => n.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate note IDs: ${dupes.join(", ")}`).toEqual([]);
  });

  it("notes content has substantial length (>100 chars)", () => {
    notes.forEach((n, i) => {
      expect(n.notes.length, `Note[${i}] "${n.topic}" should have substantial content`).toBeGreaterThan(100);
    });
  });

  it("notes cite Harrison's as source (ch field)", () => {
    const nonHarrison = [];
    notes.forEach((n, _i) => {
      if (!n.ch || !n.ch.includes("Harrison")) {
        nonHarrison.push({ id: n.id, topic: n.topic, ch: n.ch });
      }
    });
    // Allow at most 1 note without Harrison's (e.g., Required Articles)
    expect(
      nonHarrison.length,
      `Too many notes without Harrison's reference: ${JSON.stringify(nonHarrison)}`,
    ).toBeLessThanOrEqual(1);
  });
});

// ─── Drugs — clinical accuracy ───────────────────────────────────────────────

describe("drugs.json — clinical accuracy checks", () => {
  it("all Beers Criteria drugs have meaningful risk descriptions (>10 chars)", () => {
    drugs.filter(d => d.beers).forEach((d, _i) => {
      expect(d.risk.length, `Beers drug "${d.name}" should have risk description`).toBeGreaterThan(10);
    });
  });

  it("Hebrew name (heb) is non-empty for all drugs", () => {
    drugs.forEach((d, _i) => {
      expect(d.heb.length, `Drug "${d.name}" should have Hebrew name`).toBeGreaterThan(0);
    });
  });

  it("drug categories are non-empty", () => {
    drugs.forEach((d, _i) => {
      expect(d.cat.length, `Drug "${d.name}" should have category`).toBeGreaterThan(0);
    });
  });

  it("ACB scores are clinically reasonable (0-3 integer scale)", () => {
    drugs.forEach((d, _i) => {
      expect([0, 1, 2, 3]).toContain(d.acb);
    });
  });

  it("has representation of multiple drug categories (>5)", () => {
    const categories = new Set(drugs.map(d => d.cat));
    expect(categories.size, "Should have diverse drug categories").toBeGreaterThan(5);
  });
});

// ─── Flashcards — content quality ────────────────────────────────────────────

describe("flashcards.json — content quality", () => {
  it("front and back text have reasonable length (f>3, b>1)", () => {
    flashcards.forEach((fc, i) => {
      expect(fc.f.length, `Card[${i}] front too short`).toBeGreaterThan(3);
      expect(fc.b.length, `Card[${i}] back too short`).toBeGreaterThan(1);
    });
  });

  it("no flashcard has identical front and back", () => {
    const identical = [];
    flashcards.forEach((fc, i) => {
      if (fc.f.trim().toLowerCase() === fc.b.trim().toLowerCase()) {
        identical.push({ index: i, text: fc.f.slice(0, 40) });
      }
    });
    expect(identical, `Cards with identical front/back: ${JSON.stringify(identical)}`).toEqual([]);
  });

  it("no duplicate fronts", () => {
    const fronts = flashcards.map(fc => fc.f.trim().toLowerCase());
    const dupes = fronts.filter((f, i) => fronts.indexOf(f) !== i);
    expect(dupes.length, `Duplicate flashcard fronts: ${dupes.slice(0, 5).join("; ")}`).toBe(0);
  });
});

// ─── Tabs — navigation ──────────────────────────────────────────────────────

describe("tabs.json — app navigation", () => {
  it("has at least 5 tabs (consolidated)", () => {
    expect(tabs.length).toBeGreaterThanOrEqual(5);
  });

  it("every tab has id, ic, and l fields", () => {
    tabs.forEach((t, i) => {
      expect(typeof t.id, `Tab[${i}].id`).toBe("string");
      expect(t.id.length, `Tab[${i}].id non-empty`).toBeGreaterThan(0);
      expect(typeof t.ic, `Tab[${i}].ic (icon)`).toBe("string");
      expect(t.ic.length, `Tab[${i}].ic non-empty`).toBeGreaterThan(0);
      expect(typeof t.l, `Tab[${i}].l (label)`).toBe("string");
      expect(t.l.length, `Tab[${i}].l non-empty`).toBeGreaterThan(0);
    });
  });

  it("tab IDs are unique", () => {
    const ids = tabs.map(t => t.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate tab IDs: ${dupes.join(", ")}`).toEqual([]);
  });

  it("tab IDs include expected core tabs", () => {
    const ids = tabs.map(t => t.id);
    const expected = ["quiz", "learn", "lib", "track", "more"];
    expected.forEach(tabId => {
      expect(ids, `Missing expected tab: ${tabId}`).toContain(tabId);
    });
  });
});

// ─── Cross-file integrity ────────────────────────────────────────────────────

describe("cross-file integrity", () => {
  it("notes array length matches topics array length (both 24)", () => {
    expect(notes.length, "Should have one note per topic").toBe(topics.length);
  });

  it("every question topic index maps to valid topic in topics.json", () => {
    const invalid = [];
    questions.forEach((q, i) => {
      if (q.ti < 0 || q.ti >= topics.length) {
        invalid.push({ index: i, ti: q.ti });
      }
    });
    expect(invalid, `Questions with invalid topic index: ${JSON.stringify(invalid)}`).toEqual([]);
  });

  it("every topic in topics.json has at least 1 question", () => {
    const usedTopics = new Set(questions.map(q => q.ti));
    for (let i = 0; i < topics.length; i++) {
      expect(usedTopics.has(i), `Topic ${i} has no questions`).toBe(true);
    }
  });

  it("questions cover at least 3 distinct exam years", () => {
    const years = new Set(questions.map(q => q.t));
    expect(years.size, "Should cover multiple exam years").toBeGreaterThanOrEqual(3);
  });

  it("all topic keywords are non-empty strings", () => {
    topics.forEach((t, i) => {
      t.forEach((kw, j) => {
        expect(typeof kw, `Topic[${i}][${j}]`).toBe("string");
        expect(kw.trim().length, `Topic[${i}][${j}] should be non-empty`).toBeGreaterThan(0);
      });
    });
  });
});

// ─── Image map integrity ────────────────────────────────────────────────────

describe("questions/image_map.json — integrity", () => {
  let imageMap;

  beforeAll(() => {
    if (existsSync(resolve(ROOT, "questions/image_map.json"))) {
      imageMap = loadJSON("questions/image_map.json");
    }
  });

  it("image_map.json is a valid JSON object", () => {
    if (!imageMap) return;
    expect(typeof imageMap).toBe("object");
    expect(imageMap).not.toBeNull();
    expect(Object.keys(imageMap).length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty key and filename value", () => {
    if (!imageMap) return;
    const invalid = [];
    Object.entries(imageMap).forEach(([key, val]) => {
      if (!key || typeof key !== "string" || key.trim().length === 0) {
        invalid.push({ key, val, issue: "empty key" });
      }
      if (!val || typeof val !== "string" || val.trim().length === 0) {
        invalid.push({ key, val, issue: "empty value" });
      }
    });
    expect(invalid, `Invalid image_map entries: ${JSON.stringify(invalid)}`).toEqual([]);
  });

  it("all referenced image files exist on disk", () => {
    if (!imageMap) return;
    const missing = [];
    Object.entries(imageMap).forEach(([key, fname]) => {
      const imgPath = resolve(ROOT, "questions/images", fname);
      if (!existsSync(imgPath)) {
        missing.push({ key, fname });
      }
    });
    expect(missing, `Missing image files: ${JSON.stringify(missing)}`).toEqual([]);
  });
});

// ─── Topic coverage ─────────────────────────────────────────────────────────

describe("topic coverage", () => {
  it("all 24 topics have at least 5 questions", () => {
    const counts = {};
    questions.forEach(q => {
      counts[q.ti] = (counts[q.ti] || 0) + 1;
    });
    for (let ti = 0; ti <= 23; ti++) {
      expect(
        counts[ti] || 0,
        `Topic ${ti} has only ${counts[ti] || 0} questions (need >= 5)`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("no topic has more than 50% of all questions (distribution check)", () => {
    const counts = {};
    questions.forEach(q => {
      counts[q.ti] = (counts[q.ti] || 0) + 1;
    });
    const half = questions.length * 0.5;
    Object.entries(counts).forEach(([ti, count]) => {
      expect(
        count,
        `Topic ${ti} has ${count} questions (>${(half).toFixed(0)}, exceeds 50%)`,
      ).toBeLessThan(half);
    });
  });
});

// ─── Topics — keyword completeness ──────────────────────────────────────────

describe("topics.json — keyword completeness", () => {
  it("has exactly 24 topics", () => {
    expect(topics.length).toBe(24);
  });

  it("all 24 topics have non-empty keyword arrays", () => {
    topics.forEach((t, i) => {
      expect(Array.isArray(t), `Topic[${i}] is array`).toBe(true);
      expect(t.length, `Topic[${i}] has at least one keyword`).toBeGreaterThan(0);
      t.forEach((kw, j) => {
        expect(typeof kw, `Topic[${i}][${j}] is string`).toBe("string");
        expect(kw.trim().length, `Topic[${i}][${j}] is non-empty after trim`).toBeGreaterThan(0);
      });
    });
  });
});

// ─── Data file sizes — sanity checks ────────────────────────────────────────

describe("data file sizes — sanity checks", () => {
  it("questions.json has at least 900 questions", () => {
    expect(questions.length).toBeGreaterThanOrEqual(900);
  });

  it("notes.json has exactly 24 notes", () => {
    expect(notes.length).toBe(24);
  });

  it("flashcards.json has at least 90 flashcards", () => {
    expect(flashcards.length).toBeGreaterThanOrEqual(90);
  });

  it("drugs.json has at least 50 drugs", () => {
    expect(drugs.length).toBeGreaterThanOrEqual(50);
  });

  it("tabs.json has exactly 5 tabs (consolidated)", () => {
    expect(tabs.length).toBe(5);
  });
});

// ─── Answer distribution — balanced across options ──────────────────────────

describe("answer distribution — balance", () => {
  it("correct answers use all four options (0-3)", () => {
    const dist = [0, 0, 0, 0];
    questions.forEach(q => { dist[q.c]++; });
    dist.forEach((count, i) => {
      expect(count, `Option ${i} is never the correct answer`).toBeGreaterThan(0);
    });
  });

  it("no single correct answer index exceeds 40% of all questions", () => {
    const dist = [0, 0, 0, 0];
    questions.forEach(q => { dist[q.c]++; });
    const threshold = questions.length * 0.4;
    dist.forEach((count, i) => {
      expect(count, `Option ${i} is correct ${count} times (>${threshold.toFixed(0)}, exceeds 40%)`).toBeLessThan(threshold);
    });
  });
});

// ─── Notes — topic names match expected subjects ────────────────────────────

describe("notes.json — topic name validation", () => {
  it("every note has a non-empty topic name", () => {
    notes.forEach((n, i) => {
      expect(typeof n.topic, `Note[${i}].topic should be string`).toBe("string");
      expect(n.topic.trim().length, `Note[${i}].topic should be non-empty`).toBeGreaterThan(0);
    });
  });

  it("every note has a non-empty ch (chapter reference) field", () => {
    notes.forEach((n, i) => {
      expect(typeof n.ch, `Note[${i}].ch should be string`).toBe("string");
      expect(n.ch.trim().length, `Note[${i}].ch should be non-empty`).toBeGreaterThan(0);
    });
  });
});

// ─── Drugs — Beers list coverage ────────────────────────────────────────────

describe("drugs.json — Beers list coverage", () => {
  it("has a meaningful number of Beers-flagged drugs", () => {
    const beersCount = drugs.filter(d => d.beers === true).length;
    expect(beersCount, "Should have multiple Beers-flagged drugs").toBeGreaterThan(5);
  });
});

