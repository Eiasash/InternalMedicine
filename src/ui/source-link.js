// Source-link in explanations — render a clickable Harrison-chapter chip next to
// each question's explanation. The mapping comes from TOPIC_REF (topic → chapter)
// since data/questions.json has no per-question `ref` field. If a future schema
// migration adds `q.ref = {s,ch,l}`, that takes precedence.
import G from '../core/globals.js';
import { TOPIC_REF } from './track-view.js';
import { HARRISON_PDF_MAP, TOPICS } from '../core/constants.js';

// Resolve the source for a question. Returns { ch, label, kind } or null.
export function resolveSource(q) {
  if (!q) return null;
  // Per-question override (future-proof)
  if (q.ref && typeof q.ref === 'object' && q.ref.ch) {
    return { ch: q.ref.ch, label: q.ref.l || ('Harrison Ch ' + q.ref.ch), kind: q.ref.s || 'har' };
  }
  if (typeof q.ti !== 'number' || q.ti < 0) return null;
  const ref = TOPIC_REF[q.ti];
  if (!ref || !ref.ch) return null;
  return { ch: ref.ch, label: ref.l || ('Harrison Ch ' + ref.ch), kind: ref.s || 'har' };
}

// Render the inline chip — meant to live inside the explanation card.
// Idx is the index into G.QZ (or wherever the caller resolves q from).
export function renderSourceLink(qIdx) {
  const q = G.QZ && G.QZ[qIdx];
  const src = resolveSource(q);
  if (!src) return '';
  const hasPdf = HARRISON_PDF_MAP && Object.prototype.hasOwnProperty.call(HARRISON_PDF_MAP, String(src.ch));
  const tip = hasPdf ? 'Open in Harrison reader' : 'Harrison Ch ' + src.ch + ' (chapter index)';
  return `<a href="javascript:void(0)" data-action="open-source-link" data-idx="${qIdx}" title="${escapeAttr(tip)}" aria-label="${escapeAttr('Open source: ' + src.label)}" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;margin-top:6px;background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;border-radius:8px;text-decoration:none;cursor:pointer">📖 ${escapeText(src.label)} →</a>`;
}

// Open the source. Reuses window.openHarrisonChapter when present
// (set by app.js on boot for cross-module callable). Falls back to switching
// to the library tab so the chapter list is reachable.
export function openSourceForQuestion(qIdx) {
  const q = G.QZ && G.QZ[qIdx];
  const src = resolveSource(q);
  if (!src) return;
  G.tab = 'lib';
  G.libSec = 'harrison';
  if (typeof window !== 'undefined' && typeof window.openHarrisonChapter === 'function') {
    window.openHarrisonChapter(src.ch);
    return;
  }
  // Fallback: just render the library
  if (typeof G.render === 'function') G.render();
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
