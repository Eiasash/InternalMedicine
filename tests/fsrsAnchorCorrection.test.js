/**
 * FSRS difficulty-anchor correction (2026-07-18).
 *
 * Bug: fsrsUpdate() previously mean-reverted difficulty D toward FSRS_W[4]
 * (~7.21 = fsrsInitNew(1).d, the "Again" difficulty). Over repeated reviews
 * that INFLATED D toward ~7.21, and because stability growth carries an (11-D)
 * factor, high D roughly halved interval growth for well-known cards.
 *
 * Fix: mean-revert toward FSRS_D0_EASY (~3.28 = fsrsInitNew(4).d, the "Easy"
 * difficulty), matching canonical FSRS-4.5. This test pins the corrected
 * behavior with concrete recomputed values so a regression fails CI.
 *
 * Harness mirrors sharedFsrs.test.js: execute shared/fsrs.js via `new Function`
 * (the repo is ESM and the file is a browser/CJS <script>, so it is not a
 * requireable module).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

let ctx;

beforeAll(() => {
  const code = readFileSync(join(__dirname, "..", "shared", "fsrs.js"), "utf-8");
  const fn = new Function(
    code +
      "\nreturn {FSRS_W,fsrsInitNew,fsrsUpdate,fsrsInterval};"
  );
  ctx = fn();
});

const D0_EASY = 3.282856; // = fsrsInitNew(4).d, recomputed 2026-07-18
const OLD_ANCHOR = 7.2102; // = FSRS_W[4] = fsrsInitNew(1).d (the buggy target)

describe("difficulty anchor = D0_Easy (~3.28)", () => {
  it("fsrsInitNew(4).d equals the D0_Easy anchor (~3.28)", () => {
    expect(ctx.fsrsInitNew(4).d).toBeCloseTo(3.2829, 3);
    expect(ctx.fsrsInitNew(4).d).toBeCloseTo(3.28, 2);
  });

  it("fsrsInitNew(1).d is the old (~7.21) value — the anchor we moved AWAY from", () => {
    expect(ctx.fsrsInitNew(1).d).toBeCloseTo(7.2102, 4);
  });
});

describe("repeated Good drives D DOWN toward ~3.28 (not up to ~7.21)", () => {
  it("a single Good from d=7 lowers D to ~6.7635 (down, not up)", () => {
    const out = ctx.fsrsUpdate(10, 7, 0.9, 3);
    expect(out.d).toBeCloseTo(6.7635, 3);
    expect(out.d).toBeLessThan(7); // moved DOWN
    // Concrete stability for this card too (proves s unaffected by anchor change)
    expect(out.s).toBeCloseTo(23.9088, 3);
  });

  it("30 consecutive Good reviews monotonically lower D toward the D0_Easy anchor", () => {
    let d = 7;
    const seq = [];
    for (let i = 0; i < 30; i++) {
      d = ctx.fsrsUpdate(10, d, 0.9, 3).d; // newD depends only on d + rating
      seq.push(d);
    }
    // Strictly decreasing every step (mean reversion pulls down from 7 -> 3.28)
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeLessThan(seq[i - 1]);
    }
    // Concrete checkpoints (recomputed 2026-07-18)
    expect(seq[0]).toBeCloseTo(6.7635, 3);   // step 1
    expect(seq[9]).toBeCloseTo(5.2092, 3);   // step 10
    expect(seq[19]).toBeCloseTo(4.2811, 3);  // step 20
    expect(seq[29]).toBeCloseTo(3.8002, 3);  // step 30
    // It converges toward D0_Easy (~3.28), NOT toward the old ~7.21 anchor.
    const dFinal = seq[29];
    expect(Math.abs(dFinal - D0_EASY)).toBeLessThan(Math.abs(dFinal - OLD_ANCHOR));
    expect(dFinal).toBeLessThan(4.0);
    // Never rises above the starting difficulty (the old anchor would have).
    expect(Math.max(...seq)).toBeLessThan(7);
  });

  it("low difficulty yields MORE stability growth on Good than high difficulty (the (11-D) lever)", () => {
    // Same s and rPrev; only D differs. The corrected low anchor keeps D low,
    // so (11-D) is larger and stability (hence interval) grows faster.
    const lowD = ctx.fsrsUpdate(20, D0_EASY, 0.95, 3).s;
    const highD = ctx.fsrsUpdate(20, OLD_ANCHOR, 0.95, 3).s;
    expect(lowD).toBeGreaterThan(highD);
    expect(lowD).toBeCloseTo(43.5037, 3); // recomputed 2026-07-18 (d=D0_Easy)
  });
});

describe("interval growth for a well-known card", () => {
  it("repeated Good on an Easy-initialised card grows intervals fast", () => {
    let { s, d } = ctx.fsrsInitNew(4); // s=15.4722, d~3.2829
    const intervals = [ctx.fsrsInterval(s)];
    for (let i = 0; i < 6; i++) {
      const u = ctx.fsrsUpdate(s, d, 0.9, 3);
      s = u.s; d = u.d;
      intervals.push(ctx.fsrsInterval(s));
    }
    // Strictly increasing
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
    // Concrete recomputed schedule (days): 15,54,166,456,1134,2600,5556
    expect(intervals).toEqual([15, 54, 166, 456, 1134, 2600, 5556]);
    // D stays anchored low (does not inflate toward 7.21)
    expect(d).toBeCloseTo(3.2829, 3);
  });
});
