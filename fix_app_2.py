import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

def repl(m):
    arr = m.group(1)
    return f"[...{arr}].filter(b => b.sync_state !== 'delete' && !((profile || {{}}).deletedBiomarkerLogIds || []).includes(b.id)).sort((a, b) => toYYYYMMDD(a.date).localeCompare(toYYYYMMDD(b.date))).forEach"

# Replace those that we just modified with .filter(b => b.sync_state !== 'delete')
content = re.sub(r'\[\.\.\.([a-zA-Z0-9_]+)\]\.filter\(b => b\.sync_state !== \'delete\'\)\.sort\(\(a,\s*b\)\s*=>\s*toYYYYMMDD\(a\.date\)\.localeCompare\(toYYYYMMDD\(b\.date\)\)\)\.forEach', repl, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

