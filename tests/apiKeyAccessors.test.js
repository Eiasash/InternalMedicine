/**
 * Unit coverage for the getApiKey/setApiKey accessors in src/core/utils.js.
 *
 * Added with v10.4.44: the security fix removed the getApiKey() call from the
 * cloudBackup payload path, which had been these accessors' only test-exercised
 * call site. This pins their real behavior directly — localStorage key name
 * (pnimit_apikey), trim on set, and clear-on-empty — independent of cloud.js.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApiKey, setApiKey, markBadApiKey, isMarkedBadApiKey } from '../src/core/utils.js';

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

describe('API key accessors (utils.js)', () => {
  let store;
  beforeEach(() => { store = installLocalStorageShim(); });

  it('getApiKey returns empty string when unset', () => {
    expect(getApiKey()).toBe('');
  });

  it('setApiKey stores under the pnimit_apikey key, trimmed', () => {
    setApiKey('  sk-ant-abc  ');
    expect(store.get('pnimit_apikey')).toBe('sk-ant-abc');
    expect(getApiKey()).toBe('sk-ant-abc');
  });

  it('setApiKey with empty/falsy value clears the stored key', () => {
    setApiKey('sk-ant-xyz');
    expect(getApiKey()).toBe('sk-ant-xyz');
    setApiKey('');
    expect(store.has('pnimit_apikey')).toBe(false);
    expect(getApiKey()).toBe('');
  });

  // v10.4.57 round-2 (Codex P2 on #191): re-saving the SAME marked-bad key must
  // keep the known-bad marker, so a legacy cloud-restore of the just-revoked key
  // can't silently erase the guard and re-arm the stale-key loop.
  it('setApiKey re-saving the marked-bad key preserves the marker', () => {
    markBadApiKey('sk-ant-dead');
    expect(isMarkedBadApiKey('sk-ant-dead')).toBe(true);
    setApiKey('  sk-ant-dead  '); // trims to the marked value
    expect(isMarkedBadApiKey('sk-ant-dead')).toBe(true); // marker survives
  });

  it('setApiKey saving a genuinely different key clears the marker', () => {
    markBadApiKey('sk-ant-dead');
    setApiKey('sk-ant-fresh');
    expect(isMarkedBadApiKey('sk-ant-dead')).toBe(false);
    expect(getApiKey()).toBe('sk-ant-fresh');
  });
});
