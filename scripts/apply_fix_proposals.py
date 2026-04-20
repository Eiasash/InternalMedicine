#!/usr/bin/env python3
"""Apply approved fix proposals to questions.json.

Usage:
    python3 scripts/apply_fix_proposals.py <decisions.json> <questions.json>

Actions:
    apply  → mutate question per proposal (flip c OR rewrite e), remove eFlag
    reject → leave question unchanged (eFlag stays — user will handle later)
    skip   → leave question unchanged
"""
import json, sys

def main():
    if len(sys.argv) < 3:
        print("Usage: apply_fix_proposals.py <decisions.json> <questions.json>"); sys.exit(1)
    dec_path, qs_path = sys.argv[1], sys.argv[2]
    dec = json.load(open(dec_path))
    qs = json.load(open(qs_path))
    n_flip = n_rewrite = n_reject = n_skip = 0
    for idx_str, d in dec['decisions'].items():
        i = int(idx_str)
        if i >= len(qs): continue
        if d['action'] == 'apply':
            if d['fix'] == 'flip_c' and d.get('new_c') is not None:
                qs[i]['c'] = int(d['new_c'])
                qs[i].pop('eFlag', None)
                n_flip += 1
            elif d['fix'] == 'rewrite_e' and d.get('new_e'):
                qs[i]['e'] = d['new_e']
                qs[i].pop('eFlag', None)
                n_rewrite += 1
        elif d['action'] == 'reject':
            n_reject += 1
        elif d['action'] == 'skip':
            n_skip += 1
    json.dump(qs, open(qs_path,'w'), ensure_ascii=False, indent=2)
    print(f"Applied: {n_flip} c-flips + {n_rewrite} e-rewrites | rejected: {n_reject} | skipped: {n_skip}")

if __name__ == '__main__': main()
