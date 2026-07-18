/**
 * IM-3 regression: dismissing the update banner must persist under the SAME
 * localStorage key showUpdateBanner() reads ('pnimit_update_dismissed_'+version).
 * Before the fix, the app.js click handler wrote an undefined UPDATE_DISMISS_KEY
 * (a ReferenceError swallowed by try/catch), so the dismissal never stuck and the
 * banner reappeared on the next render.
 *
 * Fails on the pre-fix code (no dismissUpdateBanner export); passes on the fixed
 * code, and proves the written key is exactly the one showUpdateBanner checks
 * (the banner does not re-show after dismissal).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSWUpdate, showUpdateBanner, dismissUpdateBanner } from '../src/core/sw-update.js';

// Minimal DOM: a store keyed by element id; prepend registers, remove unregisters.
function makeDoc() {
  const store = {};
  const el = () => ({
    id: '',
    style: {},
    innerHTML: '',
    remove() {
      if (this.id && store[this.id] === this) delete store[this.id];
    },
  });
  return {
    createElement: () => el(),
    getElementById: (id) => store[id] || null,
    body: {
      prepend(e) { if (e && e.id) store[e.id] = e; },
      appendChild(e) { if (e && e.id) store[e.id] = e; },
    },
  };
}
function makeLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
  };
}

const VERSION = '9.99.9-im3';
const KEY = 'pnimit_update_dismissed_' + VERSION;

beforeEach(() => {
  vi.stubGlobal('document', makeDoc());
  vi.stubGlobal('localStorage', makeLS());
  // No serviceWorker: initSWUpdate sets _dismissKey then returns early.
  vi.stubGlobal('navigator', {});
  initSWUpdate(VERSION);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IM-3 update-banner dismissal persists under showUpdateBanner key', () => {
  it('dismiss writes the exact versioned key and removes the banner', () => {
    showUpdateBanner();
    expect(document.getElementById('update-banner')).not.toBeNull();

    dismissUpdateBanner();

    expect(localStorage.getItem(KEY)).toBe('1');
    expect(document.getElementById('update-banner')).toBeNull();
  });

  it('after dismiss, showUpdateBanner does not re-show (same key it wrote)', () => {
    showUpdateBanner();
    dismissUpdateBanner();
    showUpdateBanner(); // must early-return: localStorage[KEY] is set
    expect(document.getElementById('update-banner')).toBeNull();
  });

  it('control: banner shows when the dismiss key is absent', () => {
    showUpdateBanner();
    expect(document.getElementById('update-banner')).not.toBeNull();
  });
});
