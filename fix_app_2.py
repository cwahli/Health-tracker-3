import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("!((profile || {}).deletedBiomarkerLogIds || []).includes(h.id)", "!((profile || {}).deletedBiomarkerLogIds || {})[h.id]")
content = content.replace("const deletedBioIdsSet = new Set((profile || {}).deletedBiomarkerLogIds || []);", "const deletedBioIdsSet = (profile || {}).deletedBiomarkerLogIds || {};")

# In deletedBioIdsSet.has(h.id), we change to deletedBioIdsSet[h.id]
content = content.replace("!deletedBioIdsSet.has(h.id)", "!deletedBioIdsSet[h.id]")

with open('src/App.tsx', 'w') as f:
    f.write(content)
