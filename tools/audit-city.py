import re, sys

src = open('/home/claude/iron-gambit-agents/public/city.html').read()
code = '\n'.join(re.findall(r'<script>(.*?)</script>', src, re.S))
lines = code.split('\n')

start = next(i for i,l in enumerate(lines) if l.strip().startswith('function startCity()'))
body = lines[start+1:]

def strip_lit(s):
    s = re.sub(r'\\.', '', s)
    s = re.sub(r'"[^"]*"', '""', s)
    s = re.sub(r"'[^']*'", "''", s)
    s = re.sub(r'`[^`]*`', '``', s)
    s = re.sub(r'//.*', '', s)
    return s

depth = 0
decls = {}      # name -> declaration line (1-based, within body)
stmts = []      # (line, text) executed at depth 0
for i, ln in enumerate(body, 1):
    st = ln.strip()
    if depth == 0 and st:
        for m in re.finditer(r'\bvar\s+([A-Za-z_$][\w$]*)', strip_lit(ln)):
            decls.setdefault(m.group(1), i)
        # also catch  var a=1, b=2, c=3
        mm = re.match(r'\s*var\s+(.*)', strip_lit(ln))
        if mm:
            for nm in re.findall(r'([A-Za-z_$][\w$]*)\s*(?==|,|;|$)', mm.group(1)):
                decls.setdefault(nm, i)
        if not st.startswith('function '):
            stmts.append((i, ln))
    c = strip_lit(ln)
    depth += c.count('{') - c.count('}')
    depth = max(0, depth)

bad = []
for name, dl in decls.items():
    if len(name) < 2: continue
    pat = re.compile(r'\b' + re.escape(name) + r'\b')
    for ln_no, text in stmts:
        if ln_no >= dl: break
        if pat.search(strip_lit(text)):
            bad.append((name, dl, ln_no, text.strip()[:90])); break

print('declarations at top of startCity : %d' % len(decls))
print('statements executed at top level : %d' % len(stmts))
print()
if bad:
    print('USE BEFORE DECLARATION — these are the bugs:')
    for n, d, u, t in sorted(bad, key=lambda x: x[2]):
        print('  %-16s used at %-5d declared at %-5d' % (n, u, d))
        print('       %s' % t)
else:
    print('CLEAN: nothing is used before it is declared.')
