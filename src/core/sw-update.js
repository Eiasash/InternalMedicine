// Service-worker registration + auto-update.
// Mirrors Geriatrics' src/sw-update.js. Updates apply SILENTLY (v10.4.25):
// a freshly-installed SW auto-skipWaitings while an old one controls the page,
// and the resulting controllerchange triggers ONE reload onto the new assets.
// Fixes the stale-bundle trap (new version label via network-first HTML, old
// cache-first JS/CSS still running). Guards: _hadController (no first-install
// reload) and _refreshing (no reload loop). Banner kept as a fallback only.

let _dismissKey;
let _refreshing = false;
let _hadController = false;

export function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  if (localStorage.getItem(_dismissKey)) return;
  const b = document.createElement('div');
  b.id = 'update-banner';
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 16px;font-size:12px;display:flex;align-items:center;gap:10px;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,.3)';
  b.innerHTML = `<div><b>🆕 עדכון זמין!</b> גרסה חדשה מוכנה</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button data-action="apply-update" style="background:#fff;color:#4f46e5;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer">🔄 עדכן עכשיו</button>
<button data-action="close-update-banner" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer">✕</button>
</div>`;
  document.body.prepend(b);
}

export function applyUpdate() {
  try { localStorage.removeItem(_dismissKey); } catch (e) { /* noop */ }
  (async () => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach(r => { if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' }); });
      }
      const ks = await caches.keys();
      await Promise.all(ks.map(k => caches.delete(k)));
    } catch (e) { console.warn('Cache clear error:', e); }
    window.location.reload();
  })();
}

/**
 * Register the service worker, wire update detection, clean old caches.
 * @param {string} appVersion - APP_VERSION, used to name the dismiss key + match cache prefix
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export function initSWUpdate(appVersion) {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  _dismissKey = 'pnimit_update_dismissed_' + appVersion;

  _hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_refreshing) return;
    if (!_hadController) { _hadController = true; return; }
    _refreshing = true;
    window.location.reload();
  });

  const _autoApply = (worker) => {
    if (worker) { try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { /* noop */ } }
  };

  caches.keys().then(ks => {
    const old = ks.filter(k => k.startsWith('pnimit-') && k !== 'pnimit-v' + appVersion);
    old.forEach(k => { caches.delete(k); if(import.meta.env.DEV)console.log('Deleted old cache:', k); });
  });

  return navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) { _autoApply(reg.waiting); showUpdateBanner(); }
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) { _autoApply(nw); showUpdateBanner(); }
      });
    });
    reg.update().catch(() => {});
    return reg;
  }).catch(() => null);
}
