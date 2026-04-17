#!/usr/bin/env python3
"""
Reconstruct corrupted Hebrew exam questions using Claude Sonnet.

Input: data/questions.json (with May24 + Oct24 entries containing mojibake)
Output: data/questions.json (same file, cleaned q + o fields for corrupted entries)

For each corrupted Q, we send Claude:
- The mojibake question + 4 options
- The correct answer letter (derived from `c`)
- The answer explanation `e` (which describes the clinical scenario correctly)
- OCR text for the same question from /tmp/ocr/*.txt (bonus signal)

Claude returns clean Hebrew q + 4 options, preserving option order.
We validate JSON structure, then write back.
"""
import json, os, sys, re, time
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

API_KEY = os.environ.get('ANTHROPIC_API_KEY')
if not API_KEY:
    print("ERROR: set ANTHROPIC_API_KEY", file=sys.stderr); sys.exit(1)

MODEL = 'claude-sonnet-4-5'
ENDPOINT = 'https://api.anthropic.com/v1/messages'

BIDI_RE = re.compile(r'[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]')

def load_ocr_fulltext(tag):
    prefix = {'May24': 'may24', 'Oct24': 'oct24'}[tag]
    n_pages = {'May24': 36, 'Oct24': 30}[tag]
    parts = []
    for i in range(n_pages):
        p = Path(f'/tmp/ocr/{prefix}_p{i:02d}.txt')
        if p.exists():
            parts.append(p.read_text(encoding='utf-8', errors='replace'))
    return BIDI_RE.sub('', '\n'.join(parts))

def extract_ocr_region(ocr_full, q_num, context_chars=2000):
    """Find approximate OCR text for question number q_num.
    Heuristic: find occurrences of `\n<q_num>[.\s]`, return surrounding context.
    """
    pat = re.compile(r'(?:^|\n)\s*' + str(q_num) + r'\s*[\.\s]\s*')
    matches = list(pat.finditer(ocr_full))
    if not matches:
        return None
    # Take the first match roughly in the expected position (q_num/100 through the text)
    expected_pos = int(len(ocr_full) * (q_num / 105))
    best = min(matches, key=lambda m: abs(m.start() - expected_pos))
    start = best.start()
    end = min(len(ocr_full), start + context_chars)
    return ocr_full[start:end]

def call_claude(prompt):
    body = json.dumps({
        'model': MODEL,
        'max_tokens': 1500,
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    text = ''.join(b.get('text','') for b in data.get('content',[]) if b.get('type')=='text')
    return text

def build_prompt(q, q_num, tag, ocr_context):
    correct_letter = ['א','ב','ג','ד'][q['c']] if 0 <= q['c'] <= 3 else '?'
    ocr_block = f"\n## OCR RECONSTRUCTION (raw Hebrew from image, may contain OCR errors):\n{ocr_context}\n" if ocr_context else ""
    return f"""You are cleaning up a corrupted Israeli medical board exam question. The Hebrew text has been damaged by a PDF font-encoding bug — specifically, the letter `נ` appears as `ð`, and word order is scrambled in places. Your job is to output the clean, readable Hebrew version.

## INPUTS

### Corrupted stem:
{q['q']}

### Corrupted options (order must be preserved — this is option א, ב, ג, ד respectively):
א. {q['o'][0]}
ב. {q['o'][1]}
ג. {q['o'][2]}
ד. {q['o'][3]}

### Correct answer: {correct_letter}

### Explanation (this describes the SAME clinical scenario correctly — use it to disambiguate):
{q['e'][:1500]}
{ocr_block}
## TASK

Return a JSON object with this exact shape:
```json
{{
  "q": "clean Hebrew question stem here",
  "o": ["clean option א", "clean option ב", "clean option ג", "clean option ד"]
}}
```

RULES:
1. Preserve option order — position 0 must still be the content of option א, position 3 must still be option ד
2. Clean, grammatical Hebrew — fix the `ð`→`נ` corruption, fix word-order scrambles, add missing letters
3. Keep English medical terms / drug names exactly as they appear (e.g., "Lisinopril", "ANA", "TSH")
4. Keep numbers exactly as they should appear clinically (if OCR shows "בת 46" use 46; numbers like "180/91" may appear reversed as "091/81" in corrupt text — reverse where unambiguous from context)
5. Output ONLY the JSON object, no preamble, no commentary, no code fences
6. If the clean OCR text conflicts with the corrupted text, trust the OCR
"""

def parse_response(text):
    """Extract JSON object from Claude's response (strip code fences if present)."""
    text = text.strip()
    if text.startswith('```'):
        # Strip leading ```json or ```
        text = re.sub(r'^```(?:json)?\s*\n', '', text)
        text = re.sub(r'\n```\s*$', '', text)
    # Find first { and last }
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        raise ValueError(f"No JSON found in: {text[:200]}")
    return json.loads(text[start:end+1])

def is_clean(s):
    return 'ð' not in s and len(s.strip()) > 0

def main():
    data = json.load(open('data/questions.json', encoding='utf-8'))

    # Pre-load OCR
    ocr_by_tag = {
        'May24': load_ocr_fulltext('May24'),
        'Oct24': load_ocr_fulltext('Oct24'),
    }

    to_fix = []
    for i, q in enumerate(data):
        tag = q.get('t')
        if tag not in ('May24', 'Oct24'):
            continue
        if 'ð' in q.get('q','') or any('ð' in o for o in q.get('o',[])):
            to_fix.append(i)

    print(f"Total questions to reconstruct: {len(to_fix)}", flush=True)

    # Track position within each tag to guess question number
    pos_in_tag = {'May24': 0, 'Oct24': 0}
    tag_ordered = {}
    for tag in ('May24', 'Oct24'):
        tag_ordered[tag] = [i for i, q in enumerate(data) if q.get('t')==tag]

    def q_num_for(di):
        tag = data[di]['t']
        return tag_ordered[tag].index(di) + 1

    def process_one(di):
        q = data[di]
        tag = q['t']
        qnum = q_num_for(di)
        ocr_ctx = extract_ocr_region(ocr_by_tag[tag], qnum)
        prompt = build_prompt(q, qnum, tag, ocr_ctx)
        for attempt in range(3):
            try:
                resp = call_claude(prompt)
                parsed = parse_response(resp)
                new_q = parsed.get('q','').strip()
                new_o = parsed.get('o',[])
                if not isinstance(new_o, list) or len(new_o) != 4:
                    raise ValueError(f"bad o length")
                if not is_clean(new_q) or not all(is_clean(str(x)) for x in new_o):
                    raise ValueError("still contains ð")
                if len(new_q) < 20:
                    raise ValueError(f"stem too short")
                return di, tag, qnum, new_q, [str(x).strip() for x in new_o], None
            except Exception as e:
                if attempt >= 2:
                    return di, tag, qnum, None, None, str(e)
                time.sleep(1 + attempt * 2)

    success = 0
    failures = []
    done = 0
    lock = threading.Lock()

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(process_one, di) for di in to_fix]
        for fut in as_completed(futures):
            di, tag, qnum, new_q, new_o, err = fut.result()
            with lock:
                done += 1
                if err is None:
                    data[di]['q'] = new_q
                    data[di]['o'] = new_o
                    success += 1
                else:
                    failures.append((di, tag, qnum, err))
                if done % 20 == 0 or done < 5:
                    print(f"  [{done}/{len(to_fix)}] done. success={success} fail={len(failures)}", flush=True)
                if done % 5 == 0:
                    with open('data/questions.json', 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=0, separators=(',', ':'))

    # Final save
    with open('data/questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=0, separators=(',', ':'))

    print(f"\n=== DONE ===", flush=True)
    print(f"Success: {success}/{len(to_fix)}")
    print(f"Failures: {len(failures)}")
    if failures:
        with open('/tmp/reconstruct_failures.json', 'w') as f:
            json.dump([{'di': di, 'tag': t, 'qnum': qn, 'err': err} for di, t, qn, err in failures], f, indent=2)

if __name__ == '__main__':
    main()
