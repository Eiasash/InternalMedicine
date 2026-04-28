// tests/studyPlanAlgorithm.test.js
// Cross-language fixture for the JS port of generate_study_plan.py.
//
// The Python original (auto-audit/scripts/generate_study_plan.py) drives the
// reference plans for all three apps. The JS port here MUST produce
// byte-identical output for the Pnimit slice — same hour allocation, same
// greedy week-fill, same week_used totals — or any drift between the two
// implementations would silently desync plans across devices.
//
// Inputs frozen for the fixture:
//   slice              = syllabus_data.json["Pnimit"]      (24 topics)
//   total_topic_hours  = 89.6                              (= 16 weeks * 8 hpw * 0.7)
//   hours_per_week     = 8
//   weeks              = 16
//
// Reference outputs were captured from the live Python algorithm on
// 2026-04-28. Re-derive with:
//   python auto-audit/scripts/generate_study_plan.py --app pnimit
//          --exam-date <today + 19w> --hours-per-week 8 --ramp-weeks 3

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { allocateHours, schedule, render, buildPlan, rampStages, defaultDailyQTarget } from '../src/features/study_plan/algorithm.js';

const rootDir = resolve(import.meta.dirname, '..');
const SYLLABUS_PATH = resolve(rootDir, 'src/features/study_plan/syllabus_data.json');
const SYLLABUS = JSON.parse(readFileSync(SYLLABUS_PATH, 'utf-8'));
const PNIMIT_TOPICS = SYLLABUS.Pnimit.topics;

describe('study_plan algorithm — JS↔Python cross-language fixture (Pnimit)', () => {
  test('allocateHours: top-5 topics by hours match Python reference', () => {
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    const top5 = [...allocated].sort((a, b) => b.hours - a.hours).slice(0, 5);
    // Stable on (hours desc, id asc) — Python's sorted() is stable, so ties
    // resolve by original list order (id ascending in the syllabus slice).
    expect(top5.map((t) => ({ id: t.id, freq: t.frequency_pct, hours: t.hours }))).toEqual([
      { id:  0, freq: 8.4, hours: 6.0 },
      { id: 22, freq: 8.4, hours: 6.0 },
      { id:  5, freq: 6.7, hours: 6.0 },
      { id: 10, freq: 6.0, hours: 5.4 },
      { id:  6, freq: 5.7, hours: 5.1 },
    ]);
  });

  test('allocateHours: every topic clamped to [0.5, 6.0] and rounded to 1 decimal', () => {
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    expect(allocated.length).toBe(PNIMIT_TOPICS.length);
    for (const t of allocated) {
      expect(t.hours).toBeGreaterThanOrEqual(0.5);
      expect(t.hours).toBeLessThanOrEqual(6.0);
      // Rounded to 1dp: hours * 10 must be an integer.
      expect(Math.abs(t.hours * 10 - Math.round(t.hours * 10))).toBeLessThan(1e-9);
    }
  });

  test('schedule: week_used per cell EXACTLY matches Python (≤ 1e-9 drift)', () => {
    // Probed 2026-04-28: JS Math.round(x*10)/10 produces byte-identical output
    // to Python round(x, 1) on this fixture (no .X5 edge-case inputs hit, and
    // float-add accumulation across 16 weeks is bounded by ~16·ε·6 ≈ 2e-14).
    // The previous ±0.05 tolerance was 7 orders of magnitude too loose and
    // would have silently masked any single-topic rounding divergence.
    // If this ever loosens, investigate before relaxing — it likely indicates
    // real drift between the two implementations.
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    const { used } = schedule(allocated, 8, 16);
    const expected = [6.0, 6.0, 6.0, 5.4, 5.1, 4.6, 6.0, 6.0, 5.6, 5.1, 3.3, 3.2, 6.1, 6.1, 6.0, 6.0];
    expect(used.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(Math.abs(used[i] - expected[i])).toBeLessThan(1e-9);
    }
  });

  test('schedule: every topic placed exactly once across all weeks', () => {
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    const { weeks } = schedule(allocated, 8, 16);
    const placedIds = weeks.flat().map((t) => t.id).sort((a, b) => a - b);
    const expectedIds = [...PNIMIT_TOPICS].map((t) => t.id).sort((a, b) => a - b);
    expect(placedIds).toEqual(expectedIds);
  });

  test('schedule: weekly budget cap enforced (≤ hpw*0.7 + 0.5 fallback slack)', () => {
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    const { used } = schedule(allocated, 8, 16);
    const cap = 8 * 0.7 + 0.5; // 6.1 — matches Python's `weekly_budget + 0.5`
    for (const u of used) expect(u).toBeLessThanOrEqual(cap + 1e-9);
  });
});

describe('study_plan algorithm — render() shape', () => {
  // render() is the JS-only display helper (not in the Python original):
  // produces the structured object the Settings UI consumes. Snapshot the
  // top-level shape so refactors in the renderer stay in sync with the UI.
  test('render() produces weeks + ramp_weeks + summary with expected fields', () => {
    const allocated = allocateHours(PNIMIT_TOPICS, 89.6);
    const { weeks, used } = schedule(allocated, 8, 16);
    const startISO = '2026-05-04'; // Monday
    const examISO  = '2026-09-21'; // explicit label — total_weeks here = 16+3 = 19
    const display = render({
      startDateISO: startISO,
      examDateISO:  examISO,
      hoursPerWeek: 8,
      rampWeeks:    3,
      weeks,
      used,
      dailyQTarget: 25,
    });

    expect(display).toHaveProperty('weeks');
    expect(display).toHaveProperty('ramp_weeks');
    expect(display).toHaveProperty('summary');
    expect(display.weeks.length).toBe(16);
    expect(display.ramp_weeks.length).toBe(3);
    expect(display.summary).toMatchObject({
      exam_date: examISO,
      total_weeks: 19,
      daily_q_target: 25, // explicitly passed → echoed back unchanged
    });

    const w0 = display.weeks[0];
    expect(w0).toMatchObject({ idx: 1, start_date: '2026-05-04', end_date: '2026-05-10' });
    expect(Math.abs(w0.used_hours - 6.0)).toBeLessThan(1e-9);
    expect(w0.topics.length).toBeGreaterThan(0);
    for (const t of w0.topics) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('en');
      expect(t).toHaveProperty('he');
      expect(t).toHaveProperty('hours');
      expect(t).toHaveProperty('frequency_pct');
    }

    // First ramp week is now stage[0] = Mock #1 (Hebrew label). The "Mock exam #N"
    // English label was retired alongside the RAMP_ADVICE → RAMP_STAGES refactor.
    const r0 = display.ramp_weeks[0];
    expect(r0).toMatchObject({ idx: 1 });
    expect(r0.mock_label).toBe('בחינת דמה #1');
    expect(typeof r0.advice).toBe('string');
    expect(r0.advice.length).toBeGreaterThan(40);
    expect(r0.start_date).toBe('2026-08-24'); // start + 16 weeks = 2026-08-24
    expect(r0.end_date).toBe('2026-08-30');

    // Last ramp week (idx 3) must always be the pre-exam taper, regardless of N.
    const rLast = display.ramp_weeks[2];
    expect(rLast.mock_label).toBe('הכנה אחרונה');
  });
});

describe('study_plan algorithm — rampStages()', () => {
  // The original implementation used a 3-element advice array clamped via
  // Math.min(j, len-1), which silently re-used "Mock #3" advice for ramp_weeks
  // 4..6. rampStages() replaces that with N distinct stages, taper always last.
  test('rampStages(3) preserves backward-compatible Mock1/Mock2/Taper sequence', () => {
    const stages = rampStages(3);
    expect(stages.length).toBe(3);
    expect(stages[0].label).toBe('בחינת דמה #1');
    expect(stages[1].label).toBe('בחינת דמה #2');
    expect(stages[2].label).toBe('הכנה אחרונה');
  });

  test('rampStages(1) collapses to taper-only', () => {
    const stages = rampStages(1);
    expect(stages.length).toBe(1);
    expect(stages[0].label).toBe('הכנה אחרונה');
  });

  test('rampStages(6) emits 6 distinct labels with taper LAST', () => {
    const stages = rampStages(6);
    expect(stages.length).toBe(6);
    const labels = stages.map((s) => s.label);
    // All distinct
    expect(new Set(labels).size).toBe(6);
    // Last is always taper
    expect(labels[5]).toBe('הכנה אחרונה');
    // Earlier stages are NOT taper
    for (let i = 0; i < 5; i++) {
      expect(stages[i].label).not.toBe('הכנה אחרונה');
    }
  });

  test('rampStages clamps out-of-range inputs to [1,6]', () => {
    expect(rampStages(0).length).toBe(1);     // 0 → 1
    expect(rampStages(-3).length).toBe(1);    // negative → 1
    expect(rampStages(99).length).toBe(6);    // overshoot → 6
  });

  test('every stage has non-empty Hebrew advice', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      for (const s of rampStages(n)) {
        expect(typeof s.advice).toBe('string');
        expect(s.advice.length).toBeGreaterThan(40);
      }
    }
  });
});

describe('study_plan algorithm — defaultDailyQTarget()', () => {
  // 30% of weekly hours × 60min/hr / (2min/Q × 7days) ≈ hpw × 1.286.
  // Floored at 5/day, ceilinged at 60.
  test('matches the formula at typical inputs', () => {
    expect(defaultDailyQTarget(8)).toBe(10);   // round(8 * 1.3) = 10
    expect(defaultDailyQTarget(12)).toBe(16);  // round(12 * 1.3) = 16
    expect(defaultDailyQTarget(16)).toBe(21);  // round(16 * 1.3) = 21
    expect(defaultDailyQTarget(20)).toBe(26);  // round(20 * 1.3) = 26
  });

  test('floors small inputs at 5/day', () => {
    expect(defaultDailyQTarget(1)).toBe(5);
    expect(defaultDailyQTarget(3)).toBe(5);    // round(3*1.3)=4 → floored to 5
  });

  test('ceilings large inputs at 60/day', () => {
    expect(defaultDailyQTarget(40)).toBe(52);  // still under 60
    expect(defaultDailyQTarget(60)).toBe(60);  // round(78) → ceiling
    expect(defaultDailyQTarget(100)).toBe(60);
  });

  test('returns sane fallback for invalid inputs', () => {
    expect(defaultDailyQTarget(0)).toBe(10);
    expect(defaultDailyQTarget(-5)).toBe(10);
    expect(defaultDailyQTarget(NaN)).toBe(10);
    expect(defaultDailyQTarget(undefined)).toBe(10);
  });

  test('buildPlan uses computed default when dailyQTarget omitted', () => {
    const out = buildPlan({
      topics: PNIMIT_TOPICS,
      startDateISO: '2026-05-04',
      examDateISO:  '2026-09-21', // 20 weeks total → 17 topic weeks (3 ramp)
      hoursPerWeek: 8,
      rampWeeks:    3,
      // dailyQTarget omitted on purpose
    });
    expect(out.display.summary.daily_q_target).toBe(10); // 8 hpw → 10/day
    expect(out.planJson.inputs.dailyQTarget).toBe(10);   // resolved value persisted
  });

  test('buildPlan respects explicit dailyQTarget override', () => {
    const out = buildPlan({
      topics: PNIMIT_TOPICS,
      startDateISO: '2026-05-04',
      examDateISO:  '2026-09-21',
      hoursPerWeek: 8,
      rampWeeks:    3,
      dailyQTarget: 50,
    });
    expect(out.display.summary.daily_q_target).toBe(50);
    expect(out.planJson.inputs.dailyQTarget).toBe(50);
  });
});
