/**
 * G5 corpus guard (2026-07-18): the option-letter remap must NEVER alter a
 * medical token. Prior to the G5 fix, remapExplanationLetters carried an
 * unguarded bare-Latin `\b[A-E]\b` remap that corrupted tokens like "vitamin C",
 * "hepatitis B", "34°C", "class A", and SARC-F "**C**" whenever the deterministic
 * option-shuffle moved that letter's index.
 *
 * This test loads EVERY explanation string IM ships (data/questions.json `.e`)
 * and runs the REAL remapExplanationLetters over all of them across identity +
 * several seeded shuffle maps, asserting ZERO medical-token changes, while
 * confirming legitimate option-letter references ARE still remapped.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { remapExplanationLetters } from "../src/core/utils.js";

const questions = JSON.parse(
  readFileSync(resolve(process.cwd(), "data", "questions.json"), "utf-8"),
);
const strings = questions.map((q) => (q && q.e ? String(q.e) : "")).filter(Boolean);

// Medical / non-option tokens that must survive every shuffle unchanged.
const MED = [
  ["vitamin A-E", /vitamin\s+[A-E]\b/gi],
  ["ויטמין A-E", /ויטמין\s+[A-E]\b/g],
  ["hepatitis A-E", /hepatitis\s+[A-E]\b/gi],
  ["הפטיטיס/צהבת A-E", /(?:הפטיטיס|צהבת)\s+[A-E]\b/g],
  ["°C/°F", /°\s*[CF]\b/g],
  ["class A-E", /\bclass\s+[A-E]\b/gi],
  ["type A-E", /\btype\s+[A-E]\b/gi],
  ["grade A-E", /\bgrade\s+[A-E]\b/gi],
  ["part A-E", /\bpart\s+[A-E]\b/gi],
  ["group A-E", /\bgroup\s+[A-E]\b/gi],
  ["stage A-E", /\bstage\s+[A-E]\b/gi],
  ["bold **A-E**", /\*\*[A-E]\*\*/g],
];
const sig = (re, s) => (s.match(re) || []).join("|");

function seededShuffle(n, seed) {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const MAPS = [
  [0, 1, 2, 3], [0, 1, 2, 3, 4],
  seededShuffle(4, 17), seededShuffle(4, 12345), seededShuffle(4, 999),
  seededShuffle(5, 271828), seededShuffle(5, 424242),
  [3, 2, 1, 0], [4, 3, 2, 1, 0], [1, 2, 3, 0], [2, 3, 4, 0, 1],
];

describe("G5 corpus: remapExplanationLetters corrupts zero medical tokens", () => {
  it("ships explanations that actually contain medical A-E tokens (non-vacuous)", () => {
    let hits = 0;
    for (const s of strings) for (const [, re] of MED) hits += (s.match(re) || []).length;
    expect(strings.length).toBeGreaterThan(1000);
    expect(hits).toBeGreaterThan(0);
  });

  it("preserves every medical token across identity + seeded shuffles", () => {
    let corruptions = 0;
    const samples = [];
    for (const s of strings) {
      for (const shuf of MAPS) {
        const out = remapExplanationLetters(s, shuf);
        for (const [name, re] of MED) {
          const before = sig(re, s);
          if (before === "") continue;
          if (sig(re, out) !== before) {
            corruptions++;
            if (samples.length < 8) samples.push(`${name}: [${before}] shuf ${JSON.stringify(shuf)}`);
          }
        }
      }
    }
    expect(samples).toEqual([]);
    expect(corruptions).toBe(0);
  });
});

describe("G5: legitimate option-letter references are still remapped", () => {
  it("remaps keyword-anchored Latin refs", () => {
    expect(remapExplanationLetters("answer A", [2, 0, 1, 3])).toBe("answer B");
    expect(remapExplanationLetters("option C", [2, 0, 1, 3])).toBe("option A");
  });
  it("remaps Hebrew keyword + geresh option labels", () => {
    expect(remapExplanationLetters("תשובה ב'", [3, 2, 1, 0])).toBe("תשובה ג'");
    expect(remapExplanationLetters("**א' שגויה**", [3, 2, 1, 0])).toContain("ד' שגויה");
  });
});
