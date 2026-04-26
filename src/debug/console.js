// Built-in debug console — captures logs/errors/network/clicks into a circular
// buffer and surfaces them in a fixed bottom panel (5-tap top-right corner).
// Wraps console + fetch + window error events on import so that early-load
// errors are captured before any other module runs.
//
// API: window.__debug = { show, report, buffer, clear }

(function initDebugConsole() {
  const APP_NAME = 'Pnimit Mega';
  const MAX_LOGS = 200;
  const MAX_ERRORS = 50;
  const MAX_NETWORK = 100;
  const MAX_ACTIONS = 100;

  const buffer = { logs: [], errors: [], network: [], actions: [] };
  const clip = (arr, max) => {
    if (arr.length > max) arr.shift();
  };
  const ts = () => new Date().toISOString().slice(11, 23);

  const safeStr = (a) => {
    if (a === undefined) return 'undefined';
    if (a === null) return 'null';
    if (typeof a === 'string') return a;
    if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack.slice(0, 500) : '');
    try {
      return JSON.stringify(a).slice(0, 500);
    } catch (e) {
      return String(a);
    }
  };

  const origConsole = {};
  ['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
    origConsole[level] = console[level].bind(console);
    console[level] = function (...args) {
      try {
        buffer.logs.push({ ts: ts(), level, msg: args.map(safeStr).join(' ') });
        clip(buffer.logs, MAX_LOGS);
      } catch (e) {}
      return origConsole[level](...args);
    };
  });

  window.addEventListener('error', (e) => {
    buffer.errors.push({
      ts: ts(),
      msg: e.message || String(e),
      file: e.filename || '?',
      line: e.lineno || 0,
      col: e.colno || 0,
      stack: (e.error && e.error.stack) || '(no stack)',
    });
    clip(buffer.errors, MAX_ERRORS);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    buffer.errors.push({
      ts: ts(),
      msg: 'UnhandledRejection: ' + ((r && r.message) || String(r)),
      stack: (r && r.stack) || '(no stack)',
    });
    clip(buffer.errors, MAX_ERRORS);
  });

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (url, opts) {
      const t0 = performance.now();
      const u = typeof url === 'string' ? url : (url && url.url) || '?';
      return origFetch.apply(this, arguments).then(
        (r) => {
          buffer.network.push({ ts: ts(), url: u, status: r.status, ms: Math.round(performance.now() - t0), ok: r.ok });
          clip(buffer.network, MAX_NETWORK);
          return r;
        },
        (err) => {
          buffer.network.push({
            ts: ts(),
            url: u,
            status: 0,
            ms: Math.round(performance.now() - t0),
            error: err.message || String(err),
          });
          clip(buffer.network, MAX_NETWORK);
          throw err;
        }
      );
    };
  }

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      if (!t || !t.tagName) return;
      let label = '';
      if (t.id) label = '#' + t.id;
      else if (t.className && typeof t.className === 'string') label = '.' + t.className.split(/\s+/)[0];
      else label = t.tagName.toLowerCase();
      const da = t.getAttribute && t.getAttribute('data-action');
      if (da) label += '[' + da + ']';
      const oc = (t.getAttribute && t.getAttribute('onclick')) || '';
      const fnMatch = oc.match(/^([a-zA-Z_$][\w$]*)\s*\(/);
      if (fnMatch) label += ' → ' + fnMatch[1] + '()';
      buffer.actions.push({ ts: ts(), label });
      clip(buffer.actions, MAX_ACTIONS);
    },
    true
  );

  let taps = [];
  const corner = (x, y) => x > window.innerWidth * 0.7 && y < window.innerHeight * 0.15;
  const tap = (x, y) => {
    if (!corner(x, y)) return;
    const n = Date.now();
    taps = taps.filter((z) => n - z < 3000);
    taps.push(n);
    if (taps.length >= 5) {
      taps = [];
      showDebugPanel();
    }
  };
  document.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (t) tap(t.clientX, t.clientY);
    },
    true
  );
  document.addEventListener('click', (e) => tap(e.clientX, e.clientY), true);

  const escapeHtml = (s) =>
    String(s == null ? '' : s).replace(
      /[<>&"']/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
    );

  function buildReport() {
    const ver = window.APP_VERSION || '?';
    const swInfo =
      navigator.serviceWorker && navigator.serviceWorker.controller
        ? 'pnimit-v' + ver + ' (' + navigator.serviceWorker.controller.state + ')'
        : 'inactive';
    const mem = performance.memory
      ? 'used ' +
        Math.round(performance.memory.usedJSHeapSize / 1048576) +
        'MB / total ' +
        Math.round(performance.memory.totalJSHeapSize / 1048576) +
        'MB / limit ' +
        Math.round(performance.memory.jsHeapSizeLimit / 1048576) +
        'MB'
      : 'n/a';
    const G = window.G || {};
    const state = [];
    if (G.tab !== undefined) state.push('tab=' + G.tab);
    if (G.libSec !== undefined) state.push('libSec=' + G.libSec);
    if (G.qi !== undefined) state.push('qi=' + G.qi);
    if (Array.isArray(G.pool)) state.push('pool=' + G.pool.length);
    if (Array.isArray(G.QZ)) state.push('QZ=' + G.QZ.length);
    if (G.harChOpen) state.push('harChOpen=' + G.harChOpen);
    if (G.examMode) state.push('examMode=' + G.examMode);
    return [
      '=== DEBUG REPORT ===',
      'App: ' + APP_NAME + ' v' + ver,
      'SW: ' + swInfo,
      'URL: ' + location.href,
      'UA: ' + navigator.userAgent,
      'Screen: ' + innerWidth + 'x' + innerHeight + ' @ ' + (window.devicePixelRatio || 1) + 'dpr',
      'Memory: ' + mem,
      'State: ' + (state.join(', ') || 'none'),
      'Time: ' + new Date().toISOString(),
      '',
      '=== RECENT ERRORS (' + buffer.errors.length + ', last 10) ===',
      ...buffer.errors
        .slice(-10)
        .map(
          (e) =>
            '[' +
            e.ts +
            '] ' +
            e.msg +
            '\n  at ' +
            (e.file || '?') +
            ':' +
            (e.line || '?') +
            ':' +
            (e.col || '?') +
            '\n  ' +
            (e.stack || '').split('\n').slice(0, 5).join('\n  ')
        ),
      '',
      '=== RECENT CONSOLE (' + buffer.logs.length + ', last 50) ===',
      ...buffer.logs.slice(-50).map((l) => '[' + l.ts + ' ' + l.level.toUpperCase() + '] ' + l.msg.slice(0, 300)),
      '',
      '=== RECENT NETWORK (' + buffer.network.length + ', last 20) ===',
      ...buffer.network
        .slice(-20)
        .map(
          (n) =>
            '[' + n.ts + ' ' + (n.status || 'ERR') + ' ' + n.ms + 'ms] ' + n.url.slice(0, 120) + (n.error ? ' ERROR: ' + n.error : '')
        ),
      '',
      '=== RECENT ACTIONS (' + buffer.actions.length + ', last 30) ===',
      ...buffer.actions.slice(-30).map((a) => '[' + a.ts + '] ' + a.label),
      '',
      '=== END REPORT ===',
    ].join('\n');
  }

  function showDebugPanel() {
    const existing = document.getElementById('__debug_panel');
    if (existing) {
      existing.remove();
      return;
    }
    const panel = document.createElement('div');
    panel.id = '__debug_panel';
    panel.setAttribute(
      'style',
      'position:fixed;bottom:0;left:0;right:0;height:75vh;background:#1a1a1a;color:#e0e0e0;font:11px/1.5 ui-monospace,monospace;z-index:999999;border-top:2px solid #0891b2;overflow-y:scroll;padding:12px;box-shadow:0 -10px 30px rgba(0,0,0,0.5);direction:ltr;text-align:left'
    );
    const report = buildReport();
    panel.innerHTML =
      '<div style="display:flex;gap:8px;margin-bottom:10px;position:sticky;top:0;background:#1a1a1a;padding-bottom:8px;border-bottom:1px solid #333;flex-wrap:wrap"><button id="__db_copy" style="background:#0891b2;color:#fff;border:0;padding:8px 14px;border-radius:6px;font-weight:600">📋 Copy</button><button id="__db_clear" style="background:#444;color:#fff;border:0;padding:8px 14px;border-radius:6px">🗑️ Clear</button><button id="__db_close" style="background:#dc2626;color:#fff;border:0;padding:8px 14px;border-radius:6px">✕ Close</button><span style="color:#888;align-self:center;font-size:10px">Tap top-right 5x to reopen</span></div><pre style="white-space:pre-wrap;word-break:break-word;margin:0">' +
      escapeHtml(report) +
      '</pre>'; // safe-innerhtml: report passed through escapeHtml; static button markup is code-controlled
    document.body.appendChild(panel);
    document.getElementById('__db_copy').onclick = () => copyReport(report);
    document.getElementById('__db_clear').onclick = () => {
      buffer.logs.length = 0;
      buffer.errors.length = 0;
      buffer.network.length = 0;
      buffer.actions.length = 0;
      panel.querySelector('pre').textContent = buildReport();
    };
    document.getElementById('__db_close').onclick = () => panel.remove();
  }

  function copyReport(text) {
    const btn = document.getElementById('__db_copy');
    const flash = (msg) => {
      if (!btn) return;
      btn.textContent = msg;
      setTimeout(() => {
        const b = document.getElementById('__db_copy');
        if (b) b.textContent = '📋 Copy';
      }, 2000);
    };
    const fb = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flash('✅ Copied (fallback)!');
      } catch (e) {
        flash('❌ Copy failed');
      }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flash('✅ Copied!'), fb);
    } else {
      fb();
    }
  }

  window.__debug = {
    show: showDebugPanel,
    report: () => {
      const r = buildReport();
      origConsole.log(r);
      return r;
    },
    buffer,
    clear: () => {
      buffer.logs.length = 0;
      buffer.errors.length = 0;
      buffer.network.length = 0;
      buffer.actions.length = 0;
    },
  };
  origConsole.info('[debug-console] initialized — tap top-right 5x or call __debug.show()');
})();
