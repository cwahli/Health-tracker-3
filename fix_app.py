import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix empty arrays passed to syncLogsWithTimeBuckets
content = re.sub(r'syncLogsWithTimeBuckets\(db, uid, (\w+), (\w+), \[\], \[\],', r'syncLogsWithTimeBuckets(db, uid, \1, \2, {}, {},', content)

# Fix deletedFoodLogIds.includes
content = re.sub(r'!\(\(profile \|\| \{\}\)\.deletedFoodLogIds \|\| \[\]\)\.includes\(([^)]+)\)', r'!((profile || {}).deletedFoodLogIds || {})[\1]', content)

# Fix deletedBiomarkerLogIds.includes
content = re.sub(r'!\(\(profile \|\| \{\}\)\.deletedBiomarkerLogIds \|\| \[\]\)\.includes\(([^)]+)\)', r'!((profile || {}).deletedBiomarkerLogIds || {})[\1]', content)

# Fix deletedCustomBiomarkerKeys assignments and inclusions
content = content.replace('deletedCustomBiomarkerKeys: Array.from(deletedCustomKeys)', 'deletedCustomBiomarkerKeys: deletedCustomKeys')

# Let's fix anywhere deletedCustomKeys is defined as a Set, and make it a Record. Wait, let's see how deletedCustomKeys is defined.
