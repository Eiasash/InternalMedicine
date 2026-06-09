// tests/studyPlanPersistence.test.js
// Verifies the Study Plan cloud-persistence layer (studyPlanGet / studyPlanUpsert)
// in src/features/study_plan/index.js without hitting the network.
//
// The pure planning math (algorithm.js) is covered by studyPlanAlgorithm.test.js,
// but the Supabase RPC round-trip — payload shape + error surfacing — had no
// coverage (2026-06-09 fleet-audit gap; the module even exports
// _resetStateForTests, i.e. it was built to be tested). Mirrors the mocked-fetch
// pattern in auth.test.js (this repo has no jsdom; localStorage/window shimmed).

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

const _lsStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (_lsStore.has(k) ? _lsStore.get(k) : null),
  setItem: (k, v) => _lsStore.set(k, String(v)),
  removeItem: (k) => _lsStore.delete(k),
  clear: () => _lsStore.clear(),
};
globalThis.window = globalThis;

beforeEach(() => {
  _lsStore.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('study_plan — RPC plumbing (mocked fetch)', () => {
  test('studyPlanGet() POSTs to /rest/v1/rpc/study_plan_get with the pnimit app key', async () => {
    const { studyPlanGet } = await import('../src/features/study_plan/index.js');
    let captured;
    global.fetch = vi.fn(async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ ok: true, plan: null }), text: async () => '' };
    });
    const r = await studyPlanGet('danny');
    expect(r).toEqual({ ok: true, plan: null });
    expect(captured.url).toContain('/rest/v1/rpc/study_plan_get');
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers['apikey']).toBeDefined();
    expect(captured.opts.headers['Authorization']).toMatch(/^Bearer /);
    expect(JSON.parse(captured.opts.body)).toEqual({ p_username: 'danny', p_app: 'pnimit' });
  });

  test('studyPlanUpsert() POSTs the full plan payload with pnimit app key', async () => {
    const { studyPlanUpsert } = await import('../src/features/study_plan/index.js');
    let captured;
    global.fetch = vi.fn(async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ ok: true }), text: async () => '' };
    });
    const planJson = { weeks: [{ topic: 'Cardiology', hours: 6 }] };
    const r = await studyPlanUpsert('danny', '2026-09-01', 8, 3, planJson);
    expect(r).toEqual({ ok: true });
    expect(captured.url).toContain('/rest/v1/rpc/study_plan_upsert');
    expect(captured.opts.method).toBe('POST');
    expect(JSON.parse(captured.opts.body)).toEqual({
      p_username: 'danny',
      p_app: 'pnimit',
      p_exam_date: '2026-09-01',
      p_hours_per_week: 8,
      p_ramp_weeks: 3,
      p_plan_json: planJson,
    });
  });

  test('surfaces a structured error on HTTP failure (no throw)', async () => {
    const { studyPlanGet } = await import('../src/features/study_plan/index.js');
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' }));
    const r = await studyPlanGet('danny');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('http_500');
    expect(r.message).toBe('boom');
  });

  test('returns bad_response on a non-object body', async () => {
    const { studyPlanUpsert } = await import('../src/features/study_plan/index.js');
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => null, text: async () => '' }));
    const r = await studyPlanUpsert('danny', '2026-09-01', 8, 3, {});
    expect(r.ok).toBe(false);
    expect(r.error).toBe('bad_response');
  });

  test('returns bad_response when the body fails to parse as JSON', async () => {
    const { studyPlanGet } = await import('../src/features/study_plan/index.js');
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new Error('not json');
      },
      text: async () => '',
    }));
    const r = await studyPlanGet('danny');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('bad_response');
  });
});
