import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

def repl(m):
    arr_name = m.group(1)
    return f"[...{arr_name}].filter(b => b.sync_state !== 'delete').sort((a, b) => toYYYYMMDD(a.date).localeCompare(toYYYYMMDD(b.date))).forEach"

# Pattern to match: [...arrName].sort((a, b) => toYYYYMMDD(a.date).localeCompare(toYYYYMMDD(b.date))).forEach
# Note: we need to handle the ones that ALREADY have .filter
content = re.sub(r'\[\.\.\.([a-zA-Z0-9_]+)\]\.sort\(\(a,\s*b\)\s*=>\s*toYYYYMMDD\(a\.date\)\.localeCompare\(toYYYYMMDD\(b\.date\)\)\)\.forEach', repl, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

