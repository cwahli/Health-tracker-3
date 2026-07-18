import re

with open('src/components/LogChat.tsx', 'r') as f:
    content = f.read()

content = content.replace("const deletedIds = profile?.deletedBiomarkerLogIds || [];", "const deletedIds = profile?.deletedBiomarkerLogIds || {};")
content = content.replace("!deletedIds.includes(h.id)", "!deletedIds[h.id]")

with open('src/components/LogChat.tsx', 'w') as f:
    f.write(content)
