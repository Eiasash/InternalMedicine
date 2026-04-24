/**
 * Tests for the deadline-aware wrappers in shared/fsrs.js:
 *   fsrsDaysToExam, fsrsIntervalWithDeadline, fsrsScheduleWithDeadline
 *
 * These functions are v2 (20/04/26) of the shared FSRS module and had zero
 * dedicated test coverage before this file. They're important because
 * exam-prep users rely on them to cap the next-review interval so at least
 * one re-exposure lands before the exam date.
 *
 * The shared file is byte-identical with Geriatrics/shared/fsrs.js — keep
 * this test in sync.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

let ctx;

beforeAll(() => {
  const code = readFileSync(
    join(import.meta.dirname, "..", "shared", "fsrs.js"),
    "utf-8",
  );
  const factory = new Function(
    "window",
    "localStorage",
    code +
      "\nreturn {fsrsInterval,fsrsDaysToExam,fsrsIntervalWithDeadline,fsrsScheduleWithDeadline};",
  );
  const fakeStore = new Map();
  const fakeLocalStorage = {
    getItem: (k) => (fakeStore.has(k) ? fakeStore.get(k) : null),
    setItem: (k, v) => fakeStore.set(k, String(v)),
    removeItem: (k) => fakeStore.delete(k),
    clear: () => fakeStore.clear(),
  };
  const fakeWindow = {};
  ctx = factory(fakeWindow, fakeLocalStorage);
  ctx.__fakeLocalStorage = fakeLocalStorage;
  ctx.__fakeWindow = fakeWindow;
});

beforeEach(() => {
  ctx.__fakeLocalStorage.clear();
  delete ctx.__fakeWindow.S;
});

describe("fsrsDaysToExam", () => {
  it("returns null when no override and no localStorage entry", () => {
    expect(ctx.fsrsDaysToExam()).toBeNull();
  });

  it("returns null for malformed date strings", () => {
    expect(ctx.fsrsDaysToExam("2026/04/24")).toBeNull();
    expect(ctx.fsrsDaysToExam("tomorrow")).toBeNull();
    expect(ctx.fsrsDaysToExam("2026-4-24")).toBeNull();
  });

  it("returns 0 when the exam is already past", () => {
    expect(ctx.fsrsDaysToExam("1990-01-01")).toBe(0);
  });

  it("returns a positive integer for a future date", () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const iso = d.toISOString().slice(0, 10);
    const days = ctx.fsrsDaysToExam(iso);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });

  it("reads pnimit_exam_date from localStorage when no override", () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const iso = d.toISOString().slice(0, 10);
    ctx.__fakeLocalStorage.setItem("pnimit_exam_date", iso);
    const days = ctx.fsrsDaysToExam();
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});

describe("fsrsIntervalWithDeadline", () => {
  it("returns vanilla fsrsInterval when no exam date set", () => {
    expect(ctx.fsrsIntervalWithDeadline(10, 5, 0.9, null)).toBe(
      ctx.fsrsInterval(10),
    );
  });

  it("returns 1 when exam is today or tomorrow", () => {
    expect(ctx.fsrsIntervalWithDeadline(100, 2, 0.98, 1)).toBe(1);
  });

  it("caps at 30% of daysToExam for WEAK cards (d >= 7)", () => {
    const cap = Math.max(1, Math.floor(20 * 0.3));
    expect(ctx.fsrsIntervalWithDeadline(100, 9, 0.9, 20)).toBeLessThanOrEqual(cap);
  });

  it("caps at 30% for low retrievability (rPrev < 0.75)", () => {
    const cap = Math.max(1, Math.floor(20 * 0.3));
    expect(ctx.fsrsIntervalWithDeadline(100, 2, 0.5, 20)).toBeLessThanOrEqual(cap);
  });

  it("caps at 60% for NORMAL cards (4 <= d < 7)", () => {
    const cap = Math.max(1, Math.floor(20 * 0.6));
    const out = ctx.fsrsIntervalWithDeadline(100, 5, 0.92, 20);
    expect(out).toBeLessThanOrEqual(cap);
    expect(out).toBeGreaterThan(Math.floor(20 * 0.3));
  });

  it("caps at 85% for STRONG cards (d <= 3 AND rPrev >= 0.9)", () => {
    const cap = Math.max(1, Math.floor(20 * 0.85));
    expect(ctx.fsrsIntervalWithDeadline(100, 2, 0.95, 20)).toBeLessThanOrEqual(cap);
  });

  it("never extends past the base FSRS interval", () => {
    const base = ctx.fsrsInterval(1);
    expect(ctx.fsrsIntervalWithDeadline(1, 2, 0.98, 180)).toBe(base);
  });

  it("never returns 0 even on tight deadline + WEAK bucket", () => {
    expect(ctx.fsrsIntervalWithDeadline(100, 9, 0.5, 2)).toBeGreaterThanOrEqual(1);
  });

  it("treats NaN / null rPrev as full retrievability", () => {
    const a = ctx.fsrsIntervalWithDeadline(100, 5, null, 20);
    const b = ctx.fsrsIntervalWithDeadline(100, 5, NaN, 20);
    const c = ctx.fsrsIntervalWithDeadline(100, 5, 1.0, 20);
    expect(a).toBe(c);
    expect(b).toBe(c);
  });
});

describe("fsrsScheduleWithDeadline", () => {
  it("reports baseIntervalDays = fsrsInterval(s) and warped=false when no deadline", () => {
    const sched = ctx.fsrsScheduleWithDeadline(10, 5, 0.9, 0, null);
    expect(sched.baseIntervalDays).toBe(ctx.fsrsInterval(10));
    expect(sched.warped).toBe(false);
  });

  it("flags warped=true when deadline shortens the interval", () => {
    const sched = ctx.fsrsScheduleWithDeadline(100, 9, 0.5, 1_700_000_000_000, 5);
    expect(sched.warped).toBe(true);
    expect(sched.intervalDays).toBeLessThan(sched.baseIntervalDays);
  });

  it("computes nextReviewTime = now + intervalDays * 86_400_000", () => {
    const now = 1_700_000_000_000;
    const sched = ctx.fsrsScheduleWithDeadline(10, 5, 0.9, now, null);
    expect(sched.nextReviewTime).toBe(now + sched.intervalDays * 86_400_000);
  });
});
