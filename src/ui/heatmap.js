// Topic heatmap — SVG grid of topics colored by FSRS mastery.
// 5-step colorblind-safe Viridis scale. Tap a cell → quiz filtered to that topic.
// Per-topic mean FSRS R-value is the mastery signal (no review history → grey).
import G from '../core/globals.js';
import { TOPICS } from '../core/constants.js';
import { fsrsR } from '../sr/fsrs-bridge.js';

// Viridis 5-step (colorblind-safe). Index 0=worst (purple) → 4=best (yellow-green).
// Sources: matplotlib viridis stops at 0.0, 0.25, 0.5, 0.75, 1.0
export const VIRIDIS_5 = [
  '#440154', // weakest
  '#3b528b',
  '#21918c',
  '#5ec962',
  '#fde725', // strongest
];

// "No data" colour — light slate, distinct from every Viridis stop.
export const HEATMAP_NO_DATA = '#e2e8f0';

// Compute current retrievability R for a single FSRS state.
// Returns null when the card has never been reviewed.
export function topicCardR(sr) {
  if (!sr || sr.fsrsS === undefined || sr.fsrsD === undefined) return null;
  const last = sr.lastReview || 0;
  if (!last) return null;
  const days = Math.max(0, (Date.now() - last) / 86400000);
  const r = fsrsR(days, sr.fsrsS);
  if (!Number.isFinite(r)) return null;
  return Math.max(0, Math.min(1, r));
}

// For each topic: { ti, name, meanR, n } where meanR is mean FSRS R-value
// across reviewed cards in that topic. n = number of reviewed cards.
// Pure: depends only on its arguments (used by tests with stubs).
export function computeTopicMastery(QZ, S, TOPICS_LIST) {
  const buckets = TOPICS_LIST.map((name, ti) => ({ ti, name, sumR: 0, n: 0 }));
  if (!Array.isArray(QZ) || !S || !S.sr) return buckets.map(b => ({ ti: b.ti, name: b.name, meanR: null, n: 0 }));
  Object.entries(S.sr).forEach(([idx, sr]) => {
    const q = QZ[+idx];
    if (!q || q.ti < 0 || q.ti >= TOPICS_LIST.length) return;
    const r = topicCardR(sr);
    if (r === null) return;
    buckets[q.ti].sumR += r;
    buckets[q.ti].n += 1;
  });
  return buckets.map(b => ({
    ti: b.ti,
    name: b.name,
    meanR: b.n > 0 ? b.sumR / b.n : null,
    n: b.n,
  }));
}

// Map a 0..1 mastery value to a Viridis bucket index (0..4).
// null → -1 (caller renders the no-data colour).
export function masteryBucket(meanR) {
  if (meanR === null || meanR === undefined || !Number.isFinite(meanR)) return -1;
  // 5 evenly-spaced buckets: <0.2, <0.4, <0.6, <0.8, ≤1.0
  if (meanR < 0.2) return 0;
  if (meanR < 0.4) return 1;
  if (meanR < 0.6) return 2;
  if (meanR < 0.8) return 3;
  return 4;
}

export function masteryColor(meanR) {
  const b = masteryBucket(meanR);
  if (b === -1) return HEATMAP_NO_DATA;
  return VIRIDIS_5[b];
}

// Render an inline SVG grid. Cells emit data-action="heatmap-topic"
// + data-ti so the existing event-delegation pipeline can pick them up.
// Returns a complete <div class="card"> block ready to inject.
export function renderTopicHeatmap() {
  const rows = computeTopicMastery(G.QZ, G.S, TOPICS);
  // 6 columns × 4 rows for 24 topics (matches TOPICS.length).
  const cols = 6;
  const cellW = 56, cellH = 44, gap = 4;
  const padX = 8, padY = 8;
  const totalRows = Math.ceil(TOPICS.length / cols);
  const w = padX * 2 + cols * cellW + (cols - 1) * gap;
  const h = padY * 2 + totalRows * cellH + (totalRows - 1) * gap;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Topic mastery heatmap" style="display:block;max-width:100%">`;
  rows.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padX + col * (cellW + gap);
    const y = padY + row * (cellH + gap);
    const fill = masteryColor(r.meanR);
    const meanRPct = r.meanR === null ? '—' : Math.round(r.meanR * 100) + '%';
    const title = `${r.name}: ${meanRPct} mastery${r.n ? ` (${r.n} card${r.n === 1 ? '' : 's'})` : ' · no data'}`;
    // text colour: dark on light cells, white on dark
    const bucket = masteryBucket(r.meanR);
    const txtColor = bucket >= 3 || bucket === -1 ? '#0f172a' : '#fff';
    // 3-letter label (cell is small; full name lives in tooltip)
    const label = (r.name.match(/[A-Z][a-z]+|\S+/) || [r.name])[0].slice(0, 3);
    svg += `<g data-action="heatmap-topic" data-ti="${r.ti}" style="cursor:pointer" tabindex="0" role="button" aria-label="${escapeAttr(title)}">`;
    svg += `<title>${escapeAttr(title)}</title>`;
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="6" ry="6" fill="${fill}" stroke="rgba(15,23,42,0.08)" stroke-width="1"></rect>`;
    svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2 - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${txtColor}" pointer-events="none">${escapeText(label)}</text>`;
    svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 10}" text-anchor="middle" font-size="9" fill="${txtColor}" pointer-events="none">${escapeText(meanRPct)}</text>`;
    svg += `</g>`;
  });
  svg += `</svg>`;

  // Legend
  const legend = `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:9px;color:#64748b;flex-wrap:wrap">
<span>Mastery (FSRS R):</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${VIRIDIS_5[0]};border-radius:2px"></span>0-20%</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${VIRIDIS_5[1]};border-radius:2px"></span>20-40%</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${VIRIDIS_5[2]};border-radius:2px"></span>40-60%</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${VIRIDIS_5[3]};border-radius:2px"></span>60-80%</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${VIRIDIS_5[4]};border-radius:2px"></span>80-100%</span>
<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:10px;height:10px;background:${HEATMAP_NO_DATA};border-radius:2px;border:1px solid #cbd5e1"></span>no data</span>
</div>`;

  return `<div class="card" style="padding:14px;margin-bottom:8px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <div style="font-size:12px;font-weight:700">🌈 Topic Mastery Heatmap</div>
  <div style="font-size:9px;color:#94a3b8">Tap a cell to drill that topic</div>
</div>
${svg}
${legend}
</div>`;
}

// Minimal HTML attribute escape — SVG attrs accept the same entity set.
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
