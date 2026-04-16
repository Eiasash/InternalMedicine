#!/usr/bin/env python3
"""
Generate real Hebrew clinical explanations for Pnimit placeholder 'e' fields.

Reads API key from environment var ANTHROPIC_API_KEY.
Processes entries with 'הסבר מפורט טרם נוסף' placeholder.
Batches 5 Qs per call to claude-sonnet-4 with max_tokens=2500.
Writes results back to data/questions.json.
"""
import os, sys, json, time, re
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Run: pip install anthropic --break-system-packages", file=sys.stderr)
    sys.exit(1)

API_KEY = os.environ.get('ANTHROPIC_API_KEY')
if not API_KEY:
    print("Set ANTHROPIC_API_KEY env var", file=sys.stderr)
    print("Example: ANTHROPIC_API_KEY=sk-ant-... python3 generate_explanations.py --apply", file=sys.stderr)
    sys.exit(1)

REPO = Path(__file__).resolve().parent.parent.parent
QJ = REPO / 'data' / 'questions.json'
PLACEHOLDER_MARK = 'הסבר מפורט טרם נוסף'
MODEL = 'claude-sonnet-4-20250514'
BATCH_SIZE = 5

SYSTEM_PROMPT = """You are a senior internal medicine attending writing brief, high-quality Hebrew explanations for board exam questions for the Israeli Stage A (P0064) Internal Medicine exam.

For each question, produce a clinical explanation in Hebrew of 500-1000 characters. Structure:

## הסבר:

**למה [letter]' נכונה:** brief, mechanism-based justification citing Harrison's 22e where relevant.

**למה [other letters]' טעות:** one sentence each explaining why wrong.

**פנינה קלינית:** (optional, 1-2 sentences)

Write in clear medical Hebrew. Use English for drug names, eponyms, lab tests, and acronyms. Be direct — no filler, no "באופן כללי".

Output format: for each input question, emit:
===IDX=<idx>===
<Hebrew explanation>
===END===

No preamble. No markdown code fence around the whole response. The Hebrew explanation CAN contain markdown like **bold** or ## headers, but nothing else between the ===IDX=== and ===END=== delimiters."""

def parse_separator_response(text):
    """Parse ===IDX=<n>===...===END=== format."""
    import re
    results = []
    pattern = re.compile(r'===IDX=(\d+)===\s*(.+?)\s*===END===', re.DOTALL)
    for m in pattern.finditer(text):
        idx = int(m.group(1))
        e = m.group(2).strip()
        results.append((idx, e))
    return results

def load_placeholders(qs):
    """Return list of (idx, q_dict) for placeholder entries."""
    return [(i, q) for i, q in enumerate(qs) if PLACEHOLDER_MARK in (q.get('e','') or '')]

def build_user_message(batch):
    """batch: list of (idx, q_dict)."""
    lines = ["Generate Hebrew explanations for these exam questions:\n"]
    for idx, q in batch:
        opts = q.get('o', [])
        c = q.get('c', 0)
        correct_letter = ['א','ב','ג','ד'][c] if 0 <= c < 4 else '?'
        lines.append(f"---")
        lines.append(f"idx: {idx}")
        lines.append(f"Question: {q.get('q','')}")
        for i, opt in enumerate(opts):
            letter = ['א','ב','ג','ד'][i]
            mark = ' ← CORRECT' if i == c else ''
            lines.append(f"  {letter}. {opt}{mark}")
        lines.append(f"Correct answer: {correct_letter}")
        lines.append("")
    lines.append("Output in the specified ===IDX===/===END=== format.")
    return "\n".join(lines)

def call_api(client, batch):
    msg = build_user_message(batch)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": msg}],
    )
    text = resp.content[0].text.strip()
    return parse_separator_response(text)

def main():
    apply = '--apply' in sys.argv
    with open(QJ) as f:
        qs = json.load(f)
    
    placeholders = load_placeholders(qs)
    print(f'Placeholder entries: {len(placeholders)}')
    
    if not placeholders:
        print('Nothing to do.')
        return
    
    client = anthropic.Anthropic(api_key=API_KEY)
    
    updated = 0
    errors = []
    for batch_start in range(0, len(placeholders), BATCH_SIZE):
        batch = placeholders[batch_start:batch_start + BATCH_SIZE]
        print(f'Batch {batch_start // BATCH_SIZE + 1}: idxs {[i for i,_ in batch]}')
        try:
            results = call_api(client, batch)
            for idx, e in results:
                if idx >= len(qs): continue
                if len(e) < 50:
                    print(f'  WARN idx={idx} e too short ({len(e)} chars), skipping')
                    continue
                qs[idx]['e'] = e
                updated += 1
            print(f'  ✓ batch: {len(results)} parsed, total so far: {updated}', flush=True)
            # INCREMENTAL SAVE: write to disk after each successful batch
            if apply and results:
                with open(QJ, 'w') as f:
                    json.dump(qs, f, ensure_ascii=False, indent=1)
        except Exception as ex:
            print(f'  ✗ batch failed: {ex}')
            errors.append((batch_start, str(ex)))
        time.sleep(0.5)
    
    print(f'\nTotal updated: {updated}/{len(placeholders)}')
    if errors:
        print(f'Errors: {len(errors)}')
        for b, e in errors:
            print(f'  batch {b}: {e}')
    
    if apply and updated > 0:
        with open(QJ, 'w') as f:
            json.dump(qs, f, ensure_ascii=False, indent=1)
        print(f'Wrote to {QJ}')
    elif updated > 0:
        # Write to preview file
        preview = REPO / 'scripts' / 'exam_audit' / '_explanations_preview.json'
        preview.write_text(json.dumps(
            {str(i): qs[i]['e'] for i, _ in placeholders if len(qs[i].get('e','')) > 200 and PLACEHOLDER_MARK not in qs[i]['e']},
            ensure_ascii=False, indent=1
        ))
        print(f'Preview written to {preview} (use --apply to commit)')

if __name__ == '__main__':
    main()
