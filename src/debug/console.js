// Built-in debug console — captures logs/errors/network/clicks into a circular
// buffer and surfaces them in a fixed-position panel (5-tap top-right corner).
// Wraps console + fetch + window error events on import so that early-load
// errors are captured before any other module runs.

const BUF = { console: [], errors: [], net: [], actions: [] };
const MAX = { console: 200, errors: 50, net: 50, actions: 50 };

function push(k, v) {
  BUF[k].push(v);
  if (BUF[k].length > MAX[k]) BUF[k].shift();
}
function ts() {
  return new Date().toISOString().slice(11, 23);
}
function safeStr(a) {
  if (a === undefined) return 'undefined';
  if (a === null) return 'null';
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack.slice(0, 500) : '');
  try {
    return JSON.stringify(a).slice(0, 400);
  } catch (e) {
    return String(a);
  }
}

['log', 'info', 'warn', 'error', 'debug'].forEach((lvl) => {
  const orig = console[lvl].bind(console);
  console[lvl] = function (...args) {
    try {
      push('console', { t: ts(), lvl, msg: args.map(safeStr).join(' ') });
    } catch (e) {}
    return orig.apply(console, args);
  };
});

window.addEventListener('error', (e) => {
  push('errors', {
    t: ts(),
    kind: 'error',
    msg: e.message || String(e),
    src: (e.filename || '?') + ':' + (e.lineno || 0) + ':' + (e.colno || 0),
    stack: (e.error && e.error.stack) || '',
  });
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  push('errors', {
    t: ts(),
    kind: 'rejection',
    msg: (r && r.message) || String(r),
    src: '',
    stack: (r && r.stack) || '',
  });
});

const origFetch = window.fetch;
if (origFetch) {
  window.fetch = function (url, opts) {
    const t0 = performance.now();
    const u = typeof url === 'string' ? url : (url && url.url) || '?';
    return origFetch.apply(this, arguments).then(
      (r) => {
        push('net', { t: ts(), url: u.slice(0, 200), status: r.status, ms: Math.round(performance.now() - t0) });
        return r;
      },
      (err) => {
        push('net', {
          t: ts(),
          url: u.slice(0, 200),
          status: 'ERR',
          ms: Math.round(performance.now() - t0),
          error: String(err),
        });
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
    let label = t.tagName.toLowerCase();
    if (t.id) label += '#' + t.id;
    if (t.className && typeof t.className === 'string') {
      const c = t.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (c) label += '.' + c;
    }
    const da = t.getAttribute && t.getAttribute('data-action');
    if (da) label += '[' + da + ']';
    const txt = (t.textContent || '').trim().slice(0, 40);
    if (txt) label += ' "' + txt + '"';
    push('actions', { t: ts(), action: 'click', target: label });
  },
  true
);

let taps = [];
function corner(x, y) {
  return x > window.innerWidth * 0.7 && y < window.innerHeight * 0.15;
}
function tap(x, y) {
  if (!corner(x, y)) return;
  const n = Date.now();
  taps = taps.filter((z) => n - z < 3000);
  taps.push(n);
  if (taps.length >= 5) {
    taps = [];
    openDebug();
  }
}
document.addEventListener(
  'touchend',
  (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (t) tap(t.clientX, t.clientY);
  },
  true
);
document.addEventListener('click', (e) => tap(e.clientX, e.clientY), true);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
function getState() {
  const G = window.G || {};
  return {
    tab: G.tab !== undefined ? G.tab : '?',
    libSec: G.libSec !== undefined ? G.libSec : '?',
    poolLen: Array.isArray(G.pool) ? G.pool.length : '?',
    qi: G.qi !== undefined ? G.qi : '?',
    qzLen: Array.isArray(G.QZ) ? G.QZ.length : '?',
    sel: G.sel !== undefined ? G.sel : '?',
    ans: G.ans !== undefined ? G.ans : '?',
  };
}
function getSwInfo() {
  if (!navigator.serviceWorker) return 'no SW';
  const c = navigator.serviceWorker.controller;
  return c ? 'controller=' + c.scriptURL.split('/').pop() + ' state=' + (c.state || '?') : 'no controller';
}
function memInfo() {
  if (performance && performance.memory)
    return (
      Math.round(performance.memory.usedJSHeapSize / 1048576) +
      'MB / ' +
      Math.round(performance.memory.jsHeapSizeLimit / 1048576) +
      'MB'
    );
  return '?';
}
function getAppVersion() {
  // Pnimit exposes APP_VERSION on window via app.js boot
  return window.APP_VERSION || (window.G && window.G.APP_VERSION) || '?';
}
function renderHTML() {
  const st = getState();
  const ver = getAppVersion();
  const head = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:6px"><div style="color:#fff;font-weight:700;font-size:12px">🐛 Debug · v${esc(ver)}</div><div><button id="__dbg_copy" style="background:#0066cc;color:#fff;border:none;padding:6px 10px;margin:0 3px;border-radius:4px;font-size:11px">📋 Copy</button><button id="__dbg_clear" style="background:#cc6600;color:#fff;border:none;padding:6px 10px;margin:0 3px;border-radius:4px;font-size:11px">🗑️ Clear</button><button id="__dbg_close" style="background:#cc0000;color:#fff;border:none;padding:6px 10px;margin:0 3px;border-radius:4px;font-size:11px">✕ Close</button></div></div>`;
  const meta =
    `<div style="color:#0ff;margin-bottom:4px">State: tab=${esc(st.tab)} libSec=${esc(st.libSec)} pool=${esc(st.poolLen)} qi=${esc(st.qi)} QZ=${esc(st.qzLen)} sel=${esc(st.sel)} ans=${esc(st.ans)}</div>` +
    `<div style="color:#fa0;margin-bottom:4px">SW: ${esc(getSwInfo())}</div>` +
    `<div style="color:#888;margin-bottom:8px">${esc(window.innerWidth + 'x' + window.innerHeight)} · mem ${esc(memInfo())} · ${esc(navigator.userAgent.slice(0, 80))}</div>`;
  const errs =
    `<details open style="margin-top:8px"><summary style="color:#ff0;cursor:pointer">⚠️ Errors (${BUF.errors.length})</summary>` +
    BUF.errors
      .slice(-10)
      .reverse()
      .map(
        (e) =>
          `<div style="color:#f44;margin:4px 0;padding:4px;background:#220">[${esc(e.t)}] ${esc(e.kind)}: ${esc(e.msg)}<br><small style="color:#a66">${esc(e.src)}<br>${esc((e.stack || '').slice(0, 500))}</small></div>`
      )
      .join('') +
    `</details>`;
  const cons =
    `<details open style="margin-top:8px"><summary style="color:#ff0;cursor:pointer">📝 Console (${BUF.console.length})</summary>` +
    BUF.console
      .slice(-50)
      .reverse()
      .map((c) => {
        const col = c.lvl === 'error' ? '#f44' : c.lvl === 'warn' ? '#fa0' : c.lvl === 'info' ? '#88f' : '#aaa';
        return `<div style="color:${col};margin:2px 0">[${esc(c.t)}] ${esc(c.lvl)}: ${esc(c.msg)}</div>`;
      })
      .join('') +
    `</details>`;
  const net =
    `<details style="margin-top:8px"><summary style="color:#ff0;cursor:pointer">🌐 Network (${BUF.net.length})</summary>` +
    BUF.net
      .slice(-20)
      .reverse()
      .map((n) => {
        const col = String(n.status).charAt(0) === '2' ? '#0f0' : '#f44';
        return `<div style="color:${col};margin:2px 0">[${esc(n.t)}] ${esc(n.status)} ${esc(n.ms)}ms ${esc(n.url)}</div>`;
      })
      .join('') +
    `</details>`;
  const acts =
    `<details style="margin-top:8px"><summary style="color:#ff0;cursor:pointer">👆 Actions (${BUF.actions.length})</summary>` +
    BUF.actions
      .slice(-30)
      .reverse()
      .map((a) => `<div style="color:#0aa;margin:2px 0">[${esc(a.t)}] ${esc(a.action)}: ${esc(a.target)}</div>`)
      .join('') +
    `</details>`;
  return head + meta + errs + cons + net + acts;
}
function openDebug() {
  let p = document.getElementById('__debug_panel__');
  if (p) {
    p.remove();
    return;
  }
  p = document.createElement('div');
  p.id = '__debug_panel__';
  p.setAttribute(
    'style',
    'position:fixed;bottom:0;left:0;right:0;top:0;z-index:999999;background:#0a0a0a;color:#0f0;font-family:ui-monospace,monospace;font-size:11px;padding:12px;overflow:auto;line-height:1.4;direction:ltr;text-align:left'
  );
  p.innerHTML = renderHTML(); // safe-innerhtml: every interpolated value passes through esc()
  document.body.appendChild(p);
  const bind = () => {
    p.querySelector('#__dbg_copy').onclick = () => copyDebug(p);
    p.querySelector('#__dbg_clear').onclick = () => {
      Object.keys(BUF).forEach((k) => (BUF[k].length = 0));
      p.innerHTML = renderHTML(); // safe-innerhtml: re-render of pure debug panel
      bind();
    };
    p.querySelector('#__dbg_close').onclick = () => p.remove();
  };
  bind();
}
function copyDebug(p) {
  const st = getState();
  const ver = getAppVersion();
  const lines = [
    '# Debug snapshot v' + ver,
    'Date: ' + new Date().toISOString(),
    'UA: ' + navigator.userAgent,
    'Screen: ' + window.innerWidth + 'x' + window.innerHeight,
    'SW: ' + getSwInfo(),
    'Memory: ' + memInfo(),
    '',
    '## State',
    '- tab: ' + st.tab,
    '- libSec: ' + st.libSec,
    '- pool length: ' + st.poolLen,
    '- qi: ' + st.qi,
    '- QZ length: ' + st.qzLen,
    '- sel: ' + st.sel,
    '- ans: ' + st.ans,
    '',
    '## Errors (' + BUF.errors.length + ')',
  ];
  BUF.errors.forEach((e) =>
    lines.push('- [' + e.t + '] ' + e.kind + ': ' + e.msg + '\n  ' + (e.src || '') + '\n  ' + (e.stack || '').slice(0, 500))
  );
  lines.push('', '## Console (last ' + Math.min(BUF.console.length, 50) + ')');
  BUF.console.slice(-50).forEach((c) => lines.push('- [' + c.t + '] ' + c.lvl + ': ' + c.msg));
  lines.push('', '## Network (last 20)');
  BUF.net.slice(-20).forEach((n) => lines.push('- [' + n.t + '] ' + n.status + ' ' + n.ms + 'ms ' + n.url));
  lines.push('', '## Actions (last 30)');
  BUF.actions.slice(-30).forEach((a) => lines.push('- [' + a.t + '] ' + a.action + ': ' + a.target));
  const text = lines.join('\n');
  const btn = p.querySelector('#__dbg_copy');
  const flash = (msg) => {
    const orig = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => (btn.textContent = orig), 1500);
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
      flash('✅ Copied');
    } catch (e) {
      flash('❌ Copy failed');
    }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => flash('✅ Copied'), fb);
  } else {
    fb();
  }
}

window.__debug_open = openDebug;
