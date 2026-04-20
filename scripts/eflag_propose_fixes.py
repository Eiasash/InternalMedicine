#!/usr/bin/env python3
"""For each remaining eFlag, propose a fix via Sonnet.
Output categories:
  - flip_c: change correct-answer index (safe, small)
  - rewrite_e: current c is correct but explanation needs rewriting
  - ambiguous: can't decide without source PDF
"""
import json, os, sys, concurrent.futures
from urllib import request

API="https://api.anthropic.com/v1/messages"; MODEL="claude-sonnet-4-5"

def propose(i, q):
    prompt = f"""This board-exam MCQ has an explanation-answer mismatch. Propose the minimal fix.

Question: {q['q'][:400]}
Options:
{chr(10).join(f'  {j}: {o[:140]}' for j,o in enumerate(q['o']))}
Marked correct (c): {q['c']}
Current explanation: {q.get('e','')[:700]}

Analyze: does the explanation clearly endorse a DIFFERENT option (0-3) than the marked one?

Return STRICT JSON — pick ONE:
{{"fix":"flip_c","new_c":<0-3>,"confidence":<0.0-1.0>,"why":"<12 words>"}}
  — use if explanation unambiguously supports a specific other option

{{"fix":"rewrite_e","new_e":"<Hebrew text, ~150-250 words, explain why marked option IS correct, dismiss the other options with 1 sentence each>","confidence":<0.0-1.0>,"why":"<12 words>"}}
  — use if marked c is actually right but e describes something else

{{"fix":"ambiguous","confidence":0.0,"why":"<reason>"}}
  — use if you can't tell without the original image/source

Rules:
- For rewrite_e, Hebrew must match existing tone (## headers, **bold**, - bullets, short paragraphs).
- confidence 0.9+ means very sure; 0.7-0.9 moderate; <0.7 don't auto-apply.
- Prefer flip_c when explanation clearly points to a specific option.
- Prefer rewrite_e only if you have strong clinical basis for the marked c.
"""
    try:
        body = json.dumps({"model":MODEL,"max_tokens":1500,"messages":[{"role":"user","content":prompt}]}).encode()
        req = request.Request(API, data=body, headers={"x-api-key":os.environ['ANTHROPIC_API_KEY'],"anthropic-version":"2023-06-01","content-type":"application/json"})
        with request.urlopen(req, timeout=60) as r: data = json.loads(r.read().decode())
        txt = data['content'][0]['text'].strip()
        if txt.startswith('```'): txt = txt.strip('`').lstrip('json').strip()
        return i, json.loads(txt)
    except Exception as e:
        return i, {"fix":"error","why":str(e)[:40],"confidence":0}

def main():
    app = sys.argv[1]
    qs_path = ('geri' if app=='geri' else 'pnimit') + '/data/questions.json'
    qs = json.load(open(qs_path))
    # every question with eFlag is a real bug now (after second pass)
    targets = [(i,q) for i,q in enumerate(qs) if q.get('eFlag')]
    print(f"{app}: proposing fixes for {len(targets)} real bugs")
    proposals = {}
    done = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(propose, i, q): i for i,q in targets}
        for fut in concurrent.futures.as_completed(futs):
            i, prop = fut.result()
            proposals[str(i)] = prop
            done += 1
            if done % 50 == 0: print(f"  {done}/{len(targets)}")
    
    # Bucket by category + confidence
    buckets = {'flip_c_hi':[], 'flip_c_lo':[], 'rewrite_hi':[], 'rewrite_lo':[], 'ambiguous':[], 'error':[]}
    for idx, p in proposals.items():
        fix = p.get('fix','error')
        c = p.get('confidence', 0)
        if fix=='flip_c' and c>=0.9: buckets['flip_c_hi'].append(idx)
        elif fix=='flip_c': buckets['flip_c_lo'].append(idx)
        elif fix=='rewrite_e' and c>=0.9: buckets['rewrite_hi'].append(idx)
        elif fix=='rewrite_e': buckets['rewrite_lo'].append(idx)
        elif fix=='ambiguous': buckets['ambiguous'].append(idx)
        else: buckets['error'].append(idx)
    
    out = {'app':app, 'proposals':proposals, 'buckets':{k:len(v) for k,v in buckets.items()}, 'bucket_ids':buckets}
    out_path = f'{app}_fix_proposals.json'
    json.dump(out, open(out_path,'w'), ensure_ascii=False, indent=2)
    print(f"\n{app}: {out['buckets']} → {out_path}")

if __name__ == "__main__": main()
