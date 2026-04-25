#!/usr/bin/env python3
"""v9.80 parser-bleed discovery scan for InternalMedicine.

Mirrors Geriatrics v10.34 ca12e96. Scans data/questions.json past-exam tags
for 3 contamination patterns:
  (a) next-Q-marker bleed: <space><digits><space-or-punct>+<Hebrew-Q-stem-starter>
  (b) page-footer cruft: <date><...>שלב
  (c) over-length options (>250 chars)

Reports per-tag counts. Read-only — no modifications.
"""
import json, re
from pathlib import Path
from collections import defaultdict

QJ = Path('data/questions.json')

PAST_EXAM_TAGS = {'2020', '2021-Jun', '2022-Jun', '2023-Jun', '2024-May', '2024-Oct', '2025-Jun'}

Q_STEM_KW = r'(?:מטופל|מטופלת|בן\s*\d|בת\s*\d|בנו|בתו|איזה\s|איזו\s|מה\s|מהי\s|מהן\s|מהם\s|אילו\s|מבין\s|מי\s+מהבאים|כל\s+הבאים|לפי\s+המאמר|על\s+פי\s+המאמר|בשאלות)'
BLEED_RE = re.compile(r'\s\d{1,3}(\s+\d{1,3}){0,2}\s*["\'`?]?\s*[.:]\s+(?=' + Q_STEM_KW + ')')
FOOTER_RE = re.compile(r'\d{1,2}[/.]\d{1,2}[/.](?:20)?\d{2}.*שלב')

def main():
    b = json.load(open(QJ, encoding='utf-8'))
    bleed = defaultdict(int)
    footer = defaultdict(int)
    overlen = defaultdict(int)
    bleed_idx = []
    footer_idx = []
    over_idx = []
    for i, q in enumerate(b):
        t = q.get('t')
        if t not in PAST_EXAM_TAGS: continue
        for j, o in enumerate(q.get('o', []) or []):
            if not isinstance(o, str): continue
            L = len(o)
            if L >= 80:
                m = BLEED_RE.search(o)
                if m and m.start() > 30:
                    bleed[t] += 1
                    bleed_idx.append((i, j, t, L, m.start(), o[max(0,m.start()-20):m.start()+60]))
            if FOOTER_RE.search(o):
                footer[t] += 1
                footer_idx.append((i, j, t, o[:120]))
            if L > 250:
                overlen[t] += 1
                over_idx.append((i, j, t, L, o[:120]))
    print('=== BLEED (next-Q-marker pattern after pos 30) ===')
    for t in sorted(bleed): print(f'  {t}: {bleed[t]}')
    print(f'  TOTAL: {sum(bleed.values())}')
    print('\n=== FOOTER CRUFT (date + exam header) ===')
    for t in sorted(footer): print(f'  {t}: {footer[t]}')
    print(f'  TOTAL: {sum(footer.values())}')
    print('\n=== OVER-LENGTH (>250 chars) ===')
    for t in sorted(overlen): print(f'  {t}: {overlen[t]}')
    print(f'  TOTAL: {sum(overlen.values())}')

    print(f'\n--- 5 sample bleed cases ---')
    for i,j,t,L,p,prev in bleed_idx[:5]:
        print(f'  idx={i} t={t} o[{j}] len={L} bleed@{p}: {prev!r}')
    print(f'\n--- 5 sample footer cases ---')
    for i,j,t,prev in footer_idx[:5]:
        print(f'  idx={i} t={t} o[{j}]: {prev!r}')
    print(f'\n--- 5 sample over-length cases ---')
    for i,j,t,L,prev in over_idx[:5]:
        print(f'  idx={i} t={t} o[{j}] len={L}: {prev!r}')

if __name__ == '__main__':
    main()
