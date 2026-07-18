import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix 1: keys
target_1 = "updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}), [...keys\n    ]: Date.now() };"
replacement_1 = """updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}) };
    keys.forEach(k => { updatedProfile.deletedCustomBiomarkerKeys![k] = Date.now(); });"""
content = content.replace(target_1, replacement_1)

# Fix 2: key
target_2 = "updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}), [key\n    ]: Date.now() };"
replacement_2 = "updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}), [key]: Date.now() };"
content = content.replace(target_2, replacement_2)

# Fix 3: deletedKeys
target_3 = "updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}), [...deletedKeys\n      ]: Date.now() };"
replacement_3 = """updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}) };
      deletedKeys.forEach(k => { updatedProfile.deletedCustomBiomarkerKeys![k] = Date.now(); });"""
content = content.replace(target_3, replacement_3)

# Fix 4: deletedKeysToSync
target_4 = "updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}), [...deletedKeysToSync\n                ]: Date.now() };"
replacement_4 = """updatedProfile.deletedCustomBiomarkerKeys = { ...(updatedProfile.deletedCustomBiomarkerKeys || {}) };
                deletedKeysToSync.forEach(k => { updatedProfile.deletedCustomBiomarkerKeys![k] = Date.now(); });"""
content = content.replace(target_4, replacement_4)

with open('src/App.tsx', 'w') as f:
    f.write(content)
