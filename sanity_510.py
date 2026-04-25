"""
Sanity check: did v9.81's surgical fix on idx 510 fabricate content?
Compares current bank o[0] against the IMA source PDF + answer key.

Run from C:\\Users\\User\\repos\\InternalMedicine
Requires: pdftotext (poppler-utils) on PATH
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent if '__file__' in dir() else Path('.').resolve()

# --- 1. Load bank, locate idx 510 ---
qpath = ROOT / 'data' / 'questions.json'
if not qpath.exists():
    # Pnimit may use src/data/ or similar — search
    for cand in ROOT.rglob('questions.json'):
        if 'node_modules' not in str(cand):
            qpath = cand; break
print(f'Using bank: {qpath}')

with open(qpath, encoding='utf-8') as f:
    bank = json.load(f)

q510 = bank[510]
print(f'\n=== bank[510] (current state) ===')
print(f't:  {q510.get("t")}')
print(f'q:  {q510["q"][:150]}...')
print(f'o[0]: "{q510["o"][0]}"')
print(f'o[1]: "{q510["o"][1]}"')
print(f'o[2]: "{q510["o"][2]}"')
print(f'o[3]: "{q510["o"][3]}"')
print(f'c:  {q510.get("c")} (= "{["א","ב","ג","ד"][q510["c"]]}")')

if q510.get('t') != '2023-Jun':
    print(f'\nWARNING: idx 510 is tagged {q510.get("t")}, not 2023-Jun. Bank may have shifted since v9.81 commit.')
    # find the acid-base Q
    for i, q in enumerate(bank):
        if 'acid' in q.get('q','').lower() or 'חמצת' in q.get('q','') or 'acidosis' in str(q.get('o','')).lower():
            if q.get('t') == '2023-Jun':
                print(f'  Likely correct idx: {i}')
                break

# --- 2. Find the 2023-Jun source PDF ---
pdf_candidates = list(ROOT.rglob('*.pdf'))
pdf_candidates = [p for p in pdf_candidates
                  if '2023' in p.name
                  and 'questions' in p.name.lower()
                  and 'node_modules' not in str(p)
                  and 'dist' not in p.parts]
print(f'\n2023 exam PDFs found: {[str(p.relative_to(ROOT)) for p in pdf_candidates]}')

if not pdf_candidates:
    print('\nNo 2023 exam PDF in repo. Cannot cross-reference. Exiting.')
    sys.exit(0)

pdf_path = pdf_candidates[0]
print(f'\nExtracting from: {pdf_path}')

# --- 3. Extract Qs from PDF using v10.33 marker pattern ---
out_txt = ROOT / '_sanity_2023.txt'
subprocess.run(['pdftotext','-enc','UTF-8','-layout',str(pdf_path),str(out_txt)], check=True)
src = out_txt.read_text(encoding='utf-8')

markers = list(re.finditer(r'‪\s*\.(\d{1,3})‬', src))
nums = sorted([(m.start(), int(m.group(1)), m.end()) for m in markers])
chosen, last = [], 0
for s,n,e in nums:
    if n == last + 1:
        chosen.append((s,n,e)); last = n

pdf_qs = {}
for i, (s,n,e) in enumerate(chosen):
    end = chosen[i+1][0] if i+1 < len(chosen) else len(src)
    raw = src[e:end]
    cleaned = re.sub(r'[‪-‮‎‏]', '', raw)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    pdf_qs[n] = cleaned

print(f'PDF Qs extracted: {len(pdf_qs)} (expecting 100-150)')

# --- 4. Match q510 stem to a PDF Q ---
def norm(s):
    s = re.sub(r'[‪-‮‎‏]', '', s or '')
    return re.sub(r'[^֐-׿a-zA-Z0-9]', '', s)

target = norm(q510['q'])[:60]
best_match = None
best_score = 0
for n, txt in pdf_qs.items():
    nt = norm(txt)
    overlap = sum(1 for c in target if c in nt[:300])
    if overlap > best_score:
        best_score = overlap
        best_match = (n, txt)

if not best_match:
    print('No PDF Q matched bank[510] stem.')
    sys.exit(0)

pdf_n, pdf_txt = best_match
print(f'\n=== Best match: PDF Q{pdf_n} (overlap score {best_score}/{len(target)}) ===')
print(f'PDF text: {pdf_txt[:600]}')

# --- 5. Try to extract the 4 options from PDF Q text ---
# IMA Hebrew RTL options appear as "א." "ב." "ג." "ד." with Hebrew/clinical text after each
opt_pattern = re.compile(r'([אבגד])\s*\.\s*(.+?)(?=\s+[אבגד]\s*\.\s*|$)', re.DOTALL)
matches = opt_pattern.findall(pdf_txt)
pdf_options = {letter: text.strip() for letter, text in matches}
print(f'\nPDF options parsed: {list(pdf_options.keys())}')
for letter in ['א','ב','ג','ד']:
    if letter in pdf_options:
        print(f'  {letter}: "{pdf_options[letter][:120]}"')

# --- 6. Compare bank o[0] to PDF option א ---
print(f'\n=== VERDICT ===')
bank_o0 = q510['o'][0]
pdf_a = pdf_options.get('א', '')
print(f'Bank o[0]:  "{bank_o0}"')
print(f'PDF א:      "{pdf_a[:200]}"')

bank_norm = norm(bank_o0)
pdf_norm = norm(pdf_a)[:len(bank_norm)+20]

if not pdf_a:
    print('\n⚠ Could not extract PDF option א — manual inspection needed.')
elif bank_norm in pdf_norm or pdf_norm.startswith(bank_norm):
    print('\n✓ Bank o[0] matches PDF option א — terminal Claude reconstructed canonical content correctly.')
elif any(w in pdf_a for w in bank_o0.split() if len(w) > 3):
    print('\n△ Bank o[0] partially overlaps PDF option א — likely paraphrased canonical, defensible.')
else:
    print('\n✗ Bank o[0] does NOT match PDF option א — terminal Claude fabricated this distractor.')
    print(f'\nRecommended fix: replace bank[510].o[0] with:\n  "{pdf_a[:200]}"')

# --- 7. Cross-check answer key ---
key_candidates = [p for p in ROOT.rglob('*.pdf')
                  if '2023' in p.name
                  and ('answer' in p.name.lower() or 'key' in p.name.lower())
                  and 'node_modules' not in str(p)
                  and 'dist' not in p.parts]
if key_candidates:
    key_path = key_candidates[0]
    print(f'\n=== Answer key check: {key_path} ===')
    out_key = ROOT / '_sanity_key.txt'
    subprocess.run(['pdftotext','-enc','UTF-8','-layout',str(key_path),str(out_key)], check=True)
    ktxt = out_key.read_text(encoding='utf-8')

    # Find the line with this Q's number
    for ln in ktxt.split('\n'):
        if re.search(rf'\b{pdf_n}\b', ln) and re.search(r'[אבגד]', ln):
            letters = re.findall(r'[אבגד]', ln)
            print(f'  Official answer for Q{pdf_n}: {",".join(letters)}')
            bank_c_letter = ['א','ב','ג','ד'][q510['c']]
            if bank_c_letter in letters:
                print(f'  Bank c={bank_c_letter} ✓ matches official key')
            else:
                print(f'  ⚠ Bank c={bank_c_letter} but official key says {",".join(letters)}')
            break
else:
    print('\nNo 2023 answer key found.')

# Cleanup
for p in [out_txt, ROOT/'_sanity_key.txt']:
    if p.exists(): p.unlink()
