// JS port of auto-audit/scripts/generate_study_plan.py — Mishpacha slice.
//
// `allocateHours` and `schedule` are ported VERBATIM from the Python original.
// Any drift here desyncs the in-app plan from the reference implementation,
// so the cross-language fixture in tests/studyPlanAlgorithm.test.js pins the
// two together. If you change either function, the Python copy must be
// updated in lockstep.
//
// `render()` is JS-only — it builds the structured display object the
// Settings UI consumes. The Python version emits Markdown, which we don't
// want in-app.

// ─────────────────────────────────────────────────────────────
// allocate_hours — VERBATIM from generate_study_plan.py
// ─────────────────────────────────────────────────────────────
/**
 * Assign hours to each topic by frequency_pct, with a floor of 0.5h and a
 * ceiling of 6h per topic to avoid degenerate distributions when one topic
 * dominates the empirical frequency.
 *
 * @param {Array<Object>} topics  — each {id,en,he,keywords,n_questions,frequency_pct,...}
 * @param {number}        totalHours — typically `topic_weeks * hours_per_week * 0.7`
 * @returns {Array<Object>} new array of `{...topic, hours}` (1-decimal-rounded)
 */
export function allocateHours(topics, totalHours) {
  const totalFreq = topics.reduce((s, t) => s + t.frequency_pct, 0) || 100.0;
  return topics.map((t) => {
    const share = t.frequency_pct / totalFreq;
    // round(max(0.5, min(6.0, share*total_hours)), 1)
    const raw = Math.max(0.5, Math.min(6.0, share * totalHours));
    const hours = Math.round(raw * 10) / 10;
    return { ...t, hours };
  });
}

// ─────────────────────────────────────────────────────────────
// schedule — VERBATIM from generate_study_plan.py
// ─────────────────────────────────────────────────────────────
/**
 * Greedy weekly allocation: high-frequency topics first, fill week up to
 * 0.7 * hours_per_week (rest reserved for Q-bank work). Falls back to the
 * least-loaded week if no week has capacity within `weekly_budget + 0.5`.
 *
 * The 0.7 multiplier is intentional — it carves out 30% of the weekly study
 * budget for spaced-repetition Q-bank reviews, which the plan does NOT
 * schedule explicitly (the user runs them daily via the existing FSRS
 * engine). DO NOT raise it without coordinating with the Q-bank workload.
 *
 * @param {Array<Object>} topics — output of allocateHours()
 * @param {number}        hoursPerWeek
 * @param {number}        weeks  — number of topic-study weeks (excludes ramp)
 * @returns {{ weeks: Array<Array<Object>>, used: number[] }}
 */
export function schedule(topics, hoursPerWeek, weeks) {
  const weeklyBudget = hoursPerWeek * 0.7;
  // sorted(topics, key=lambda t: -t['frequency_pct'])  → stable descending by frequency_pct
  const sortedTopics = [...topics].sort((a, b) => b.frequency_pct - a.frequency_pct);
  const weeksArr = Array.from({ length: weeks }, () => []);
  const used = new Array(weeks).fill(0);

  for (const t of sortedTopics) {
    let placed = false;
    for (let i = 0; i < weeks; i++) {
      // used[i] + t.hours <= weekly_budget + 0.5  → tolerate up to half-hour overshoot
      if (used[i] + t.hours <= weeklyBudget + 0.5 + 1e-9) {
        weeksArr[i].push(t);
        used[i] += t.hours;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // i = min(range(weeks), key=lambda j: used[j])  → least-loaded week, ties → smallest idx
      let minIdx = 0;
      for (let j = 1; j < weeks; j++) if (used[j] < used[minIdx]) minIdx = j;
      weeksArr[minIdx].push(t);
      used[minIdx] += t.hours;
    }
  }

  // Round used[] to 1dp for display parity with Python's f"{used[i]:.1f}".
  // Internal float-add drift accumulates to ~1e-13; keep the raw sum for
  // the budget assertion and round only at the boundary.
  const usedRounded = used.map((u) => Math.round(u * 10) / 10);
  return { weeks: weeksArr, used: usedRounded };
}

// ─────────────────────────────────────────────────────────────
// render — JS-only structured display data for the Settings UI
// ─────────────────────────────────────────────────────────────
// Build-up ramp stages (used for ramp weeks 1..N-1 when N >= 2). The pre-exam
// taper week is always TAPER_STAGE and is always the LAST week regardless of N.
//
// Why: the previous design hard-coded 3 advice strings and clamped j to the
// last index, which meant ramp_weeks=4..6 silently re-used "Mock #3" three
// times in a row. This redesign keeps the common ramp_weeks=3 case unchanged
// (Mock #1 → Mock #2 → taper) while giving 4..6 sensible distinct stages.
const RAMP_BUILDUP = [
  {
    label: 'בחינת דמה #1',
    advice:
      'בחינת דמה ראשונה במצב מלא ומוקצב. סקירת כל טעות, סימון לחזרה (FSRS). חזרה חמה: 5 הנושאים החלשים ביותר במוק (בדרך כלל בעלי תדירות גבוהה שציון < 70%).',
  },
  {
    label: 'בחינת דמה #2',
    advice:
      'בחינת דמה שנייה — סט שאלות חדש במצב מוקצב. השווה למוק #1: אילו נושאים השתפרו ואילו לא. תרגול ממוקד בנושאים בעלי תדירות גבוהה שציון < 70%.',
  },
  {
    label: 'תרגול ממוקד',
    advice:
      'תרגול אינטנסיבי בנושאים החלשים שזוהו במוקים — 40-50 שאלות/יום מהמאגר. סקירת FSRS יומית. בלי חומר חדש מהותי — העמקה והבהרה של אלגוריתמים ופרוטוקולים.',
  },
  {
    label: 'בחינת דמה #3',
    advice:
      'בחינת דמה שלישית במצב מלא. עדכון רשימת הנושאים החלשים. תרגול נוסף בנושאים שעוד לא הגיעו ל-70% — לא ללמוד חומר חדש, רק להעמיק ולחדד.',
  },
  {
    label: 'תרגול שאלות',
    advice:
      'תרגול שאלות אינטנסיבי — 50/יום מהמאגר עם דגש על נושאים בעלי תדירות גבוהה. סקירת FSRS יומית. בלי חומר חדש; חזרות קצרות בלבד על אלגוריתמים מרכזיים.',
  },
];

// The taper week is always the LAST ramp week. Lifted from the original
// "Mock #3" advice — semantically a pre-exam wind-down, not another mock.
const RAMP_TAPER = {
  label: 'הכנה אחרונה',
  advice:
    'שבוע פתיחת מבחן: חזרה קלה בלבד, 8 שעות שינה, ללא חומר חדש ב-48 השעות האחרונות. סימולציה אחרונה (חצי בחינה) 4-5 ימים לפני. אין למידה ביום שלפני.',
};

/**
 * Returns the ordered list of ramp-week stages for a given ramp_weeks count.
 * Last entry is ALWAYS the taper. ramp_weeks=1 collapses to taper-only.
 * Exported for tests; do not import from index.js.
 *
 * @param {number} rampWeeks  1..6
 * @returns {Array<{label:string,advice:string}>}
 */
export function rampStages(rampWeeks) {
  const n = Math.max(1, Math.min(6, rampWeeks | 0));
  if (n === 1) return [RAMP_TAPER];
  // Take first (n-1) build-up stages, then append taper.
  return [...RAMP_BUILDUP.slice(0, n - 1), RAMP_TAPER];
}

function _addDaysISO(iso, days) {
  // ISO date math without timezone surprises: build a UTC midnight, add days, format.
  const [y, m, d] = iso.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Default daily Q-bank target derived from the weekly hour budget.
 *
 * Math: 30% of weekly hours are reserved for Q-bank (the 0.3 share carved
 * out by allocateHours' totalHours = topicWeeks * hoursPerWeek * 0.7).
 * At ~2 minutes per question (Pnimit cohort empirical avg), that yields:
 *
 *   daily_q ≈ hoursPerWeek * 0.3 * 60 / (2 * 7) ≈ hoursPerWeek * 1.286
 *
 * Floored at 5/day so a 1-2 hpw user still has a meaningful baseline target;
 * ceilinged at 60 to avoid pathological values from hpw inputs near 40.
 *
 * Previous implementation hardcoded 25, which was over-budget for hpw < 19
 * and under-budget for hpw > 19. Callers can still pass dailyQTarget
 * explicitly to override.
 *
 * @param {number} hoursPerWeek
 * @returns {number} integer questions/day target
 */
export function defaultDailyQTarget(hoursPerWeek) {
  const hpw = Number(hoursPerWeek);
  if (!Number.isFinite(hpw) || hpw <= 0) return 10;
  return Math.max(5, Math.min(60, Math.round(hpw * 1.3)));
}

/**
 * Build the structured display object consumed by the Settings UI.
 *
 * @param {Object} args
 * @param {string} args.startDateISO  YYYY-MM-DD
 * @param {string} args.examDateISO   YYYY-MM-DD
 * @param {number} args.hoursPerWeek
 * @param {number} args.rampWeeks
 * @param {Array<Array<Object>>} args.weeks  — output of schedule().weeks
 * @param {number[]} args.used               — output of schedule().used
 * @param {number} [args.dailyQTarget]   — when omitted, defaultDailyQTarget(hoursPerWeek) is used
 * @returns {{
 *   weeks: Array<{idx,start_date,end_date,topics,used_hours}>,
 *   ramp_weeks: Array<{idx,start_date,end_date,mock_label,advice}>,
 *   summary: {exam_date,total_weeks,daily_q_target,start_date,hours_per_week,ramp_weeks,topic_weeks}
 * }}
 */
export function render({
  startDateISO,
  examDateISO,
  hoursPerWeek,
  rampWeeks,
  weeks,
  used,
  dailyQTarget,
}) {
  const dqt = (dailyQTarget == null) ? defaultDailyQTarget(hoursPerWeek) : dailyQTarget;
  const topicWeeks = weeks.length;
  const totalWeeks = topicWeeks + rampWeeks;

  const weeksOut = weeks.map((wTopics, i) => {
    const startISO = _addDaysISO(startDateISO, i * 7);
    const endISO   = _addDaysISO(startISO, 6);
    return {
      idx: i + 1,
      start_date: startISO,
      end_date:   endISO,
      topics: wTopics.map((t) => ({
        id:             t.id,
        en:             t.en,
        he:             t.he,
        hours:          t.hours,
        frequency_pct:  t.frequency_pct,
        keywords:       Array.isArray(t.keywords) ? t.keywords.slice(0, 8) : [],
      })),
      used_hours: used[i],
    };
  });

  const rampOut = [];
  const stages = rampStages(rampWeeks);
  for (let j = 0; j < rampWeeks; j++) {
    const startISO = _addDaysISO(startDateISO, (topicWeeks + j) * 7);
    const endISO   = _addDaysISO(startISO, 6);
    const stage    = stages[j] || stages[stages.length - 1];
    rampOut.push({
      idx: j + 1,
      start_date: startISO,
      end_date:   endISO,
      // mock_label kept for backward-compat with existing planJson consumers;
      // value is now the stage label (Hebrew), not always "Mock exam #N".
      mock_label: stage.label,
      advice:     stage.advice,
    });
  }

  return {
    weeks: weeksOut,
    ramp_weeks: rampOut,
    summary: {
      start_date:     startDateISO,
      exam_date:      examDateISO,
      total_weeks:    totalWeeks,
      topic_weeks:    topicWeeks,
      ramp_weeks:     rampWeeks,
      hours_per_week: hoursPerWeek,
      daily_q_target: dqt,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Convenience wrapper: takes the raw Mishpacha topic slice + user inputs
// and returns the full display object. Used by the Settings UI.
// ─────────────────────────────────────────────────────────────
/**
 * @param {Object} args
 * @param {Array<Object>} args.topics       — raw topics from syllabus_data.json[<App>].topics
 * @param {string} args.startDateISO
 * @param {string} args.examDateISO
 * @param {number} args.hoursPerWeek
 * @param {number} args.rampWeeks
 * @param {number} [args.dailyQTarget]      — when omitted, defaultDailyQTarget(hoursPerWeek) is used
 * @returns {{display: ReturnType<typeof render>, planJson: Object}}
 */
export function buildPlan({
  topics,
  startDateISO,
  examDateISO,
  hoursPerWeek,
  rampWeeks,
  dailyQTarget,
}) {
  const start = new Date(startDateISO + 'T00:00:00Z').getTime();
  const exam  = new Date(examDateISO  + 'T00:00:00Z').getTime();
  if (!(exam > start)) throw new Error('exam_date_must_be_after_start_date');
  const totalWeeks = Math.floor((exam - start) / (86400000 * 7));
  if (totalWeeks < rampWeeks + 4) {
    throw new Error('not_enough_weeks');
  }
  const topicWeeks = totalWeeks - rampWeeks;
  const totalTopicHours = topicWeeks * hoursPerWeek * 0.7;

  // Resolve daily-Q target ONCE so display + planJson.inputs agree.
  const dqt = (dailyQTarget == null) ? defaultDailyQTarget(hoursPerWeek) : dailyQTarget;

  const allocated = allocateHours(topics, totalTopicHours);
  const { weeks, used } = schedule(allocated, hoursPerWeek, topicWeeks);
  const display = render({
    startDateISO,
    examDateISO,
    hoursPerWeek,
    rampWeeks,
    weeks,
    used,
    dailyQTarget: dqt,
  });

  // planJson is what we persist server-side via study_plan_upsert(). Keeping
  // both the structured display + the per-topic allocation lets a future
  // device rebuild the UI without re-running the algorithm.
  const planJson = {
    version: 1,
    generated_at: new Date().toISOString(),
    inputs: { startDateISO, examDateISO, hoursPerWeek, rampWeeks, dailyQTarget: dqt },
    allocated,
    display,
  };
  return { display, planJson };
}
