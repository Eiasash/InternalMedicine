# Debug Console — Pnimit Mega

A built-in mobile-first debug console. No `chrome://inspect` needed.

## How to open

**Tap the top-right corner of the screen 5 times within 3 seconds.**

The corner zone covers roughly the upper 15% of the screen, right of the 70% mark. If 3 seconds pass without 5 taps, the counter resets.

Manual fallback (DevTools): `__debug.show()`

## What it shows

| Section | Contents |
|---|---|
| **Header** | App name + APP_VERSION, SW state, URL, user agent, screen size + DPR, memory usage |
| **State** | Current `G.tab`, `G.libSec`, `G.qi`, `G.pool` size, `G.QZ` size, `G.harChOpen`, `G.examMode` |
| **⚠️ Errors** | Last 10 uncaught errors + unhandled promise rejections, with file/line/col + first 5 stack frames |
| **📝 Console** | Last 50 `console.log/info/warn/error/debug` calls |
| **🌐 Network** | Last 20 `fetch()` calls — status, ms, URL. `ERR` prefix for failures |
| **👆 Actions** | Last 30 user clicks — selector + `data-action` + onclick function name |

## How to report a bug

1. Open the panel (5 taps top-right)
2. Tap **📋 Copy** — the report is now on your clipboard, formatted as plain text
3. Paste into your chat with Claude, or into a GitHub issue
4. Tap **✕ Close** when done

## Privacy

The report includes app version, SW state, URL, user agent, screen size, memory usage, your last 30 click selectors, recent network URLs, recent console output, and errors with stack traces.

The report does **NOT** include question content, answer keys, study notes, your saved progress / FSRS state, localStorage / IndexedDB contents, or Supabase auth tokens.

## API (DevTools console)

```js
__debug.show()    // open the panel
__debug.report()  // log + return the full report
__debug.buffer    // raw {logs, errors, network, actions}
__debug.clear()   // empty all four buffers
```

## Implementation

`src/debug/console.js` — imported as the FIRST line of `src/ui/app.js` so wrappers install before any other module's import-time code runs. Same module ports verbatim from Geriatrics; keep changes in sync across § C (Mishpacha), § D (Geriatrics), § E (Pnimit).
