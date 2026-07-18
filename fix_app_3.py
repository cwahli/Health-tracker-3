import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix updatedProfile.deletedBiomarkerLogIds = [ ... ]
pattern_bio = r"updatedProfile\.deletedBiomarkerLogIds\s*=\s*\[\s*\.\.\.\(updatedProfile\.deletedBiomarkerLogIds \|\| \[\]\),\s*\.\.\.(\w+)\s*\];"
replacement_bio = """updatedProfile.deletedBiomarkerLogIds = { ...(updatedProfile.deletedBiomarkerLogIds || {}) };
      \\1.forEach((id: string) => { updatedProfile.deletedBiomarkerLogIds![id] = Date.now(); });"""
content = re.sub(pattern_bio, replacement_bio, content)

# Fix updatedProfile.deletedFoodLogIds = [ ... ]
pattern_food = r"updatedProfile\.deletedFoodLogIds\s*=\s*\[\s*\.\.\.\(updatedProfile\.deletedFoodLogIds \|\| \[\]\),\s*id\s*\];"
replacement_food = """updatedProfile.deletedFoodLogIds = { ...(updatedProfile.deletedFoodLogIds || {}), [id]: Date.now() };"""
content = re.sub(pattern_food, replacement_food, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
