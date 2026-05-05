/**
 * Tests for the under-covered cloud sync + feedback helpers in
 * src/features/cloud.js:
 *   _sbDeviceId           — stable per-device id stored in localStorage
 *   fetchLeaderboard      — resilient to network failure
 *   cloudBackup           — POSTs payload; catches failure via toast
 *   saveAnswerReport      — silent on network error
 *   getDiagnostics        — summary string for bug reports
 *   renderFeedback        — HTML renderer covering empty + populated cases
 *   submitFeedbackForm    — validates empty input, persists to LS, emits fetch
 *
 * Network calls and heavy transitive imports are stubbed (no real fetch,
 * no track-view, no real spaced-repetition) so we can run under Node.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({ 0: { ok: 2, no: 1, tot: 3 } })),
  getDueQuestions: vi.fn(() => []),
}));

import G from '../src/core/globals.js';
import {
  _sbDeviceId,
  fetchLeaderboard,
  cloudBackup,
  saveAnswerReport,
  getDiagnostics,
  renderFeedback,
  submitFeedbackForm,
} from '../src/features/cloud.js';
import { callAI } from '../src/ai/client.js';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  return store;
}

function installDomShim() {
  const byId = new Map();
  function makeEl(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      style: {},
      textContent: '',
      innerHTML: '',
      disabled: false,
      value: '',
      _parent: null,
      appendChild() {},
      addEventListener() {},
      remove() {},
    };
    Object.defineProperty(el, 'id', {
      get() { return el.__id || ''; },
      set(v) {
        if (el.__id) byId.delete(el.__id);
        el.__id = v;
        if (v) byId.set(v, el);
      },
    });
    return el;
  }
  globalThis.document = {
    body: { appendChild: () => {} },
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => makeEl(tag),
  };
  return { byId, makeEl };
}

beforeEach(() => {
  installLocalStorageShim();
  installDomShim();
  G.S = {
    sr: {}, streak: 0, qOk: 0, qNo: 0, ck: {}, bk: {}, dark: false,
  };
  G.QZ = [
    { q: 'Q1 stem text that is long enough', o: ['a', 'b', 'c', 'd'], c: 0 },
    { q: 'Q2', o: ['a', 'b'], c: 1 },
  ];
  G.pool = [];
  G.qi = 0;
  G.render = vi.fn();
  G.save = vi.fn();
  globalThis.fetch = vi.fn();
  // getDiagnostics reads navigator.userAgent, navigator.onLine, screen.*,
  // devicePixelRatio. Node 20 (used in CI) exposes none of these globals;
  // Node 22+ (local dev) has `navigator` but no `screen`/`devicePixelRatio`.
  // Shim only when missing so we don't trip Node 22's read-only navigator.
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { userAgent: 'vitest', onLine: true };
  }
  if (typeof globalThis.screen === 'undefined') {
    globalThis.screen = { width: 1024, height: 768 };
  }
  if (typeof globalThis.devicePixelRatio === 'undefined') {
    globalThis.devicePixelRatio = 2;
  }
  callAI.mockReset();
});

// ---- _sbDeviceId -----------------------------------------------------------

describe('_sbDeviceId', () => {
  it('generates and caches a device id on first call', () => {
    expect(localStorage.getItem('pnimit_devid')).toBeNull();
    const id = _sbDeviceId();
    expect(id).toMatch(/^dev_[a-z0-9]+$/);
    expect(localStorage.getItem('pnimit_devid')).toBe(id);
  });

  it('returns the same id on repeated calls', () => {
    const a = _sbDeviceId();
    const b = _sbDeviceId();
    expect(a).toBe(b);
  });
});

// ---- fetchLeaderboard ------------------------------------------------------

describe('fetchLeaderboard', () => {
  it('returns the parsed JSON body on success', async () => {
    const body = [{ uid: 'u1', answered: 100, correct: 80 }];
    globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve(body) });
    const rows = await fetchLeaderboard();
    expect(rows).toEqual(body);
  });

  it('returns [] when the request throws', async () => {
    globalThis.fetch.mockRejectedValue(new Error('offline'));
    const rows = await fetchLeaderboard();
    expect(rows).toEqual([]);
  });
});

// ---- cloudBackup -----------------------------------------------------------

describe('cloudBackup', () => {
  it('POSTs G.S plus sibling mock/sessions bundles via backup_set RPC (v10.4.13)', async () => {
    localStorage.setItem('pnimit_mock_hist', JSON.stringify([{ s: 1 }]));
    localStorage.setItem('pnimit_sessions', JSON.stringify([{ x: 1 }]));
    globalThis.fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, updated_at: '2026-05-05T00:00:00Z' }) });
    await cloudBackup();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    // v10.4.13 (Track-Q): write path migrated to /rest/v1/rpc/backup_set
    // (SECURITY DEFINER) because direct PostgREST table writes returned
    // 401/PG-42501 under the new sb_publishable_* key format.
    expect(url).toContain('/rest/v1/rpc/backup_set');
    expect(init.method).toBe('POST');
    const payload = JSON.parse(init.body);
    expect(payload.p_app).toBe('pnimit');
    expect(payload.p_id).toMatch(/^dev_/);
    expect(payload.p_data._mockHist).toEqual([{ s: 1 }]);
    expect(payload.p_data._sessions).toEqual([{ x: 1 }]);
  });

  it('surfaces server failures via toast instead of throwing', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false, status: 500, text: () => Promise.resolve('boom'),
    });
    await expect(cloudBackup()).resolves.toBeUndefined();
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch.mockRejectedValue(new Error('offline'));
    await expect(cloudBackup()).resolves.toBeUndefined();
  });

  it('uses single-call SECURITY DEFINER RPC backup_set — no fallback (v10.4.13)', async () => {
    // Track-Q sibling propagation: replaces v10.4.12's merge-duplicates direct
    // table POST. SECURITY DEFINER bypasses RLS so the new sb_publishable_*
    // key format works (it didn't on direct table writes, returning 401/42501).
    globalThis.fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    await cloudBackup();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/rest/v1/rpc/backup_set');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
  });
});

// ---- saveAnswerReport ------------------------------------------------------

describe('saveAnswerReport', () => {
  it('POSTs a trimmed report payload to answer_reports', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true });
    await saveAnswerReport(0, 'the answer key is wrong because …', 'VERDICT: WRONG');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/rest/v1/answer_reports');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.app).toBe('pnimit');
    expect(body.question_idx).toBe(0);
    expect(body.question_text.length).toBeLessThanOrEqual(200);
    expect(body.reported_answer.length).toBeLessThanOrEqual(50);
    expect(body.device_id).toMatch(/^dev_/);
  });

  it('swallows network errors silently', async () => {
    globalThis.fetch.mockRejectedValue(new Error('net'));
    await expect(saveAnswerReport(0, 'reason', 'verdict')).resolves.toBeUndefined();
  });
});

// ---- getDiagnostics --------------------------------------------------------

describe('getDiagnostics', () => {
  it('produces a summary string containing key metrics', () => {
    G.S.qOk = 50;
    G.S.qNo = 10;
    G.S.sr = { 0: { next: 0, ef: 2.5, n: 1 }, 1: { next: Date.now() + 1e7, ef: 2.1, n: 0 } };
    G.S.streak = 7;
    G.S.ck = { 0: true, 1: true };
    G.S.bk = { 0: true };
    const txt = getDiagnostics();
    expect(txt).toContain('Pnimit Mega');
    expect(txt).toContain('Answered: 60');
    expect(txt).toContain('Streak: 7 days');
    expect(txt).toContain('SR:'); // counts line
    expect(txt).toContain('Weakest 5 topics');
    expect(txt).toContain('Storage:');
  });

  it('handles empty state without throwing', () => {
    expect(() => getDiagnostics()).not.toThrow();
    expect(getDiagnostics()).toContain('Weakest 5 topics');
  });
});

// ---- renderFeedback --------------------------------------------------------

describe('renderFeedback', () => {
  it('returns HTML with the feedback form controls', () => {
    const html = renderFeedback();
    expect(html).toContain('id="fb-type"');
    expect(html).toContain('id="fb-text"');
    expect(html).toContain('submit-feedback');
    // No submissions list yet.
    expect(html).not.toContain('Your Submissions');
  });

  it('lists up to 5 recent submissions newest first', () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      type: 'bug', text: `entry-${i}`, ts: Date.now() - i * 1000,
    }));
    localStorage.setItem('pnimit_fb_sent', JSON.stringify(entries));
    const html = renderFeedback();
    expect(html).toContain('Your Submissions (7)');
    // Newest first means the LAST pushed entry (entry-6) appears first in the list.
    // The slice(-5).reverse() takes [2..6] then reverses → [6,5,4,3,2].
    expect(html.indexOf('entry-6')).toBeLessThan(html.indexOf('entry-2'));
    expect(html).not.toContain('entry-0'); // pruned off by slice(-5)
  });

  it('sanitizes submission text so HTML does not leak into the markup', () => {
    const entries = [{
      type: 'bug', text: '<script>alert(1)</script>', ts: Date.now(),
    }];
    localStorage.setItem('pnimit_fb_sent', JSON.stringify(entries));
    const html = renderFeedback();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('survives corrupt localStorage JSON', () => {
    localStorage.setItem('pnimit_fb_sent', '{broken json');
    expect(() => renderFeedback()).not.toThrow();
  });
});

// ---- submitFeedbackForm ----------------------------------------------------

describe('submitFeedbackForm', () => {
  it('aborts early with a toast when text is empty', async () => {
    const typeEl = document.createElement('select'); typeEl.id = 'fb-type'; typeEl.value = 'bug';
    const textEl = document.createElement('textarea'); textEl.id = 'fb-text'; textEl.value = '   ';
    await submitFeedbackForm();
    expect(fetch).not.toHaveBeenCalled();
    // No new entries persisted.
    expect(localStorage.getItem('pnimit_fb_sent')).toBeNull();
  });

  it('persists the entry to localStorage and POSTs to supabase', async () => {
    const typeEl = document.createElement('select'); typeEl.id = 'fb-type'; typeEl.value = 'feature';
    const textEl = document.createElement('textarea'); textEl.id = 'fb-text'; textEl.value = 'add dark mode please';
    globalThis.fetch.mockResolvedValue({ ok: true });
    callAI.mockResolvedValue('Acknowledged — feasible.');
    await submitFeedbackForm();
    const saved = JSON.parse(localStorage.getItem('pnimit_fb_sent'));
    expect(saved).toHaveLength(1);
    expect(saved[0].text).toBe('add dark mode please');
    expect(saved[0].type).toBe('feature');
    expect(saved[0].aiResponse).toContain('Acknowledged');
    // One call to Supabase feedback endpoint.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/rest/v1/pnimit_feedback');
  });

  it('still persists the entry when Supabase POST fails', async () => {
    const typeEl = document.createElement('select'); typeEl.id = 'fb-type'; typeEl.value = 'other';
    const textEl = document.createElement('textarea'); textEl.id = 'fb-text'; textEl.value = 'thanks';
    globalThis.fetch.mockRejectedValue(new Error('offline'));
    callAI.mockRejectedValue(new Error('no_key'));
    await submitFeedbackForm();
    const saved = JSON.parse(localStorage.getItem('pnimit_fb_sent'));
    expect(saved[0].text).toBe('thanks');
    // AI failure must NOT wipe the primary entry.
    expect(saved[0].aiResponse).toBeUndefined();
  });
});
