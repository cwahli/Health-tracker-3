import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("cloudProfile?.deletedFoodLogIds || localProfile?.deletedFoodLogIds || []", "cloudProfile?.deletedFoodLogIds || localProfile?.deletedFoodLogIds || {}")
content = content.replace("cloudProfile?.deletedBiomarkerLogIds || localProfile?.deletedBiomarkerLogIds || []", "cloudProfile?.deletedBiomarkerLogIds || localProfile?.deletedBiomarkerLogIds || {}")

content = content.replace("deletedFoodLogIds: Array.from(deletedFoods),", "deletedFoodLogIds: deletedFoods,")
content = content.replace("deletedBiomarkerLogIds: Array.from(deletedBioLogs),", "deletedBiomarkerLogIds: deletedBioLogs,")

content = content.replace("!((profile || {}).deletedFoodLogIds || []).includes(f.id)", "!(profile?.deletedFoodLogIds?.[f.id] && (profile?.deletedFoodLogIds?.[f.id] || 0) >= (f.updated_at || 0))")

content = content.replace("!((profile || {}).deletedBiomarkerLogIds || []).includes(b.id)", "!(profile?.deletedBiomarkerLogIds?.[b.id] && (profile?.deletedBiomarkerLogIds?.[b.id] || 0) >= (b.updated_at || 0))")

content = content.replace("const migrationDeletedFoodIds = new Set<string>(loadedProfile?.deletedFoodLogIds || []);", "const migrationDeletedFoodIds = new Set<string>(Object.keys(loadedProfile?.deletedFoodLogIds || {}));")

content = content.replace("const migrationDeletedBioIds = new Set<string>(loadedProfile?.deletedBiomarkerLogIds || []);", "const migrationDeletedBioIds = new Set<string>(Object.keys(loadedProfile?.deletedBiomarkerLogIds || {}));")

content = content.replace("deletedFoodLogIds: updatedProfile?.deletedFoodLogIds || [],", "deletedFoodLogIds: updatedProfile?.deletedFoodLogIds || {},")
content = content.replace("deletedBiomarkerLogIds: updatedProfile?.deletedBiomarkerLogIds || [],", "deletedBiomarkerLogIds: updatedProfile?.deletedBiomarkerLogIds || {},")


# Fix deletedFoods uses that assume array
content = re.sub(r'const deletedFoods = (updatedProfile\?.deletedFoodLogIds \|\| profile\?.deletedFoodLogIds \|\| \[\]);', r'const deletedFoods = updatedProfile?.deletedFoodLogIds || profile?.deletedFoodLogIds || {};', content)
content = re.sub(r'const deletedFoods = (currProfile\?.deletedFoodLogIds \|\| profile\?.deletedFoodLogIds \|\| \[\]);', r'const deletedFoods = currProfile?.deletedFoodLogIds || profile?.deletedFoodLogIds || {};', content)

content = re.sub(r'const deletedBioLogs = (updatedProfile\?.deletedBiomarkerLogIds \|\| profile\?.deletedBiomarkerLogIds \|\| \[\]);', r'const deletedBioLogs = updatedProfile?.deletedBiomarkerLogIds || profile?.deletedBiomarkerLogIds || {};', content)
content = re.sub(r'const deletedBioLogs = (currProfile\?.deletedBiomarkerLogIds \|\| profile\?.deletedBiomarkerLogIds \|\| \[\]);', r'const deletedBioLogs = currProfile?.deletedBiomarkerLogIds || profile?.deletedBiomarkerLogIds || {};', content)

# Fix save operations appending to array
content = content.replace("deletedFoodLogIds: [...(profile.deletedFoodLogIds || []), id]", "deletedFoodLogIds: { ...(profile.deletedFoodLogIds || {}), [id]: Date.now() }")
content = content.replace("deletedBiomarkerLogIds: [...(profile.deletedBiomarkerLogIds || []), id]", "deletedBiomarkerLogIds: { ...(profile.deletedBiomarkerLogIds || {}), [id]: Date.now() }")


with open('src/App.tsx', 'w') as f:
    f.write(content)
