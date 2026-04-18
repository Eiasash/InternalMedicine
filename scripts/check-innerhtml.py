#!/usr/bin/env python3
"""Audit .innerHTML for unsanitized interpolation across src/.

Rules:
  * FAIL (exit 1) on any `.innerHTML = <expr>` where <expr> contains `+` or
    `${...}` interpolation AND does not call `sanitize(` anywhere in the
    assignment expression (which may span multiple lines up to the next `;`).
  * Allow explicit opt-out via `// safe-innerhtml: <reason>` inside the span
    or on the line directly preceding the assignment. The reason is required
    so every exemption is auditable by `grep -n safe-innerhtml`.

This is a lightweight guard — not a full static analysis — but catches the
classic `el.innerHTML = userInput + ...` mistake before it lands on main.
Ported from Geriatrics/scripts/check-innerhtml.py.
"""
import re
import sys
from pathlib import Path

OPEN_RE = re.compile(r'\.innerHTML\s*=(?!=)')
SAFE_MARK = 'safe-innerhtml:'
# Scan source trees; skip generated, vendored, and test fixtures.
ROOTS = ['src', 'shared']
SKIP_DIRS = {'node_modules', 'dist', '.git'}


def scan_file(path: Path):
    text = path.read_text(encoding='utf-8')
    lines = text.split('\n')
    violations = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        m = OPEN_RE.search(line)
        if not m:
            i += 1
            continue
        start_line = i
        buf = line[m.end():]
        j = i
        while ';' not in buf and j + 1 < n:
            j += 1
            buf += '\n' + lines[j]
        expr = buf.split(';', 1)[0]
        lookback_start = max(0, start_line - 1)
        annotated = any(SAFE_MARK in lines[k] for k in range(lookback_start, j + 1))
        has_interp = '+' in expr or '${' in expr
        has_sanitize = 'sanitize(' in expr
        if has_interp and not has_sanitize and not annotated:
            violations.append((str(path), start_line + 1, line.strip()[:100]))
        i = j + 1
    return violations


def main():
    root = Path('.')
    findings = []
    for top in ROOTS:
        base = root / top
        if not base.exists():
            continue
        for p in base.rglob('*.js'):
            if any(skip in p.parts for skip in SKIP_DIRS):
                continue
            findings.extend(scan_file(p))
    if findings:
        print(f'FAIL: {len(findings)} innerHTML assignments with unsanitized interpolation:')
        for path, line_no, preview in findings:
            print(f'  {path}:{line_no}  {preview}')
        print('  Fix: wrap dynamic input in sanitize(), or add')
        print('       `// safe-innerhtml: <reason>` if the input is provably static / internal.')
        return 1
    print('OK: No unsanitized innerHTML interpolation')
    return 0


if __name__ == '__main__':
    sys.exit(main())
