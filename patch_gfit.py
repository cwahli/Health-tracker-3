import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("!log.note.includes('Google Fit')", "!log.note.includes('Auto-synced from Google Fit')")

with open('src/App.tsx', 'w') as f:
    f.write(content)

