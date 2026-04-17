#!/usr/bin/env python3
"""
Reconstruct questions from older IMA exam sessions (2020, Jun21-Jun25) that have
formatting corruption: missing spaces, reversed digits, sentence fragments,
wrong-side punctuation, content bleed between adjacent questions.

Strategy: send each corrupted question + its clean explanation to Claude, ask for
a cleaned-up version while preserving answer-letter alignment.
"""
import json, os, sys, re, time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

API_KEY = os.environ.get('ANTHROPIC_API_KEY')
assert API_KEY, "set ANTHROPIC_API_KEY"

MODEL = 'claude-sonnet-4-5'
ENDPOINT = 'https://api.anthropic.com/v1/messages'

OLDER_TAGS = {'2020','Jun21','Jun22','Jun23','Jun25'}

def needs_fix(q):
    if q.get('t') not in OLDER_TAGS:
        return False
    text = (q.get('q','') or '') + ' ' + ' '.join(q.get('o',[]) or [])
    if re.search(r'[\u0590-\u05FF]\d', text): return True
    if re.search(r'\b0\d', text): return True
    if re.search(r'\?[\u0590-\u05FF]', text): return True
    if re.search(r'\s\.\s[\u0590-\u05FF]', text): return True
    if re.search(r'\s\d{1,2}\.\s', text): return True
    return False


def call_claude(prompt, retries=3):
    body = json.dumps({
        'model': MODEL,
        'max_tokens': 2000,
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
    })
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.loads(r.read())
            return ''.join(b.get('text','') for b in data.get('content',[]) if b.get('type')=='text')
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 + attempt * 3)
    raise last_err


def build_prompt(q):
    correct_letter = ['א','ב','ג','ד'][q['c']] if 0 <= q['c'] <= 3 else '?'
    return f"""You are cleaning up an Israeli medical board exam question that has formatting corruption from broken PDF extraction. Common issues:
1. Missing spaces between Hebrew and numbers: "בן58" should be "בן 58"
2. Reversed digits: "01-06%" should be "10-60%", "בת06" should be "בת 60"  
3. Misplaced punctuation: "?לב" should end with ".לב" or similar
4. Adjacent question fragments leaking in: "...NYHA IV 2. באיזה מהמצבים" — drop the "2. ..." fragment
5. Broken words with stray spaces: "לק טט" should be "לקטט"

## INPUTS

### Corrupted stem:
{q['q']}

### Corrupted options (positions 0..3 = א, ב, ג, ד — MUST preserve this order):
א. {q['o'][0]}
ב. {q['o'][1]}
ג. {q['o'][2]}
ד. {q['o'][3]}

### Correct answer: {correct_letter}

### Explanation (clinically correct — use to disambiguate ambiguous numbers):
{q['e'][:1500]}

## TASK

Return ONLY a JSON object (no preamble, no code fences):
{{
  "q": "cleaned Hebrew stem",
  "o": ["cleaned option א", "cleaned option ב", "cleaned option ג", "cleaned option ד"]
}}

RULES:
1. Preserve option order — the correct answer must still be at position {q['c']} (letter {correct_letter})
2. Fix formatting, NOT content. Do not change medical facts, drug names, or clinical values
3. If a digit pair is ambiguous (could be "56" or "65"), infer from clinical context and the explanation
4. Keep English medical/drug terms EXACTLY as written
5. Remove content from adjacent questions that leaked into this stem (usually recognizable as " N. ..." at the end where N is a small number)
6. If you cannot identify a clean version, return the input with ONLY spacing fixes
"""

def parse_response(text):
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*\n', '', text)
    text = re.sub(r'\n```\s*$', '', text)
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        raise ValueError(f"No JSON: {text[:150]}")
    return json.loads(text[start:end+1])


def validate(new_q, new_o, orig_q, orig_o, q_obj):
    if not isinstance(new_o, list) or len(new_o) != 4:
        return False, "bad o len"
    if not new_q or len(new_q.strip()) < 20:
        return False, "stem too short"
    if 'ð' in new_q or any('ð' in str(o) for o in new_o):
        return False, "mojibake returned"
    # Must still have Hebrew content
    heb = sum(1 for c in new_q if '\u0590' <= c <= '\u05FF')
    if heb < len(new_q) * 0.2:
        return False, "not enough Hebrew"
    return True, "ok"


def main():
    data = json.load(open('data/questions.json', encoding='utf-8'))
    to_fix = [i for i, q in enumerate(data) if needs_fix(q)]
    print(f"To fix: {len(to_fix)}", flush=True)

    success = 0
    failures = []
    done = 0
    lock = threading.Lock()

    def process(di):
        q = data[di]
        prompt = build_prompt(q)
        try:
            resp = call_claude(prompt)
            parsed = parse_response(resp)
            new_q = parsed.get('q','').strip()
            new_o = [str(x).strip() for x in parsed.get('o',[])]
            ok, msg = validate(new_q, new_o, q['q'], q['o'], q)
            if not ok:
                return di, None, None, msg
            return di, new_q, new_o, None
        except Exception as e:
            return di, None, None, str(e)

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(process, di) for di in to_fix]
        for fut in as_completed(futures):
            di, new_q, new_o, err = fut.result()
            with lock:
                done += 1
                if err is None:
                    data[di]['q'] = new_q
                    data[di]['o'] = new_o
                    success += 1
                else:
                    failures.append((di, err))
                if done % 25 == 0:
                    print(f"  [{done}/{len(to_fix)}] success={success} fail={len(failures)}", flush=True)
                if done % 10 == 0:
                    with open('data/questions.json', 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=0, separators=(',', ':'))

    # Final save
    with open('data/questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=0, separators=(',', ':'))

    print(f"\n=== DONE === success={success}/{len(to_fix)} failures={len(failures)}")
    if failures:
        with open('/tmp/recon_v2_failures.json','w') as f:
            json.dump(failures, f)
        print("Failures saved to /tmp/recon_v2_failures.json")

if __name__ == '__main__':
    main()
