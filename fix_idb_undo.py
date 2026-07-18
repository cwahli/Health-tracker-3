import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Undo all
content = content.replace("safeGetDocs", "getDocs")
content = content.replace("safeGetDoc", "getDoc")
content = content.replace("safeGetStorageKey", "getStorageKey")
content = content.replace("safeGetSnapshotKey", "getSnapshotKey")
content = content.replace(".safeGet(", ".get(")
content = content.replace("safeSetProfile", "setProfile")
content = content.replace("safeSetFoodLogs", "setFoodLogs")
content = content.replace("safeSetBiomarkers", "setBiomarkers")
content = content.replace("safeSetBiomarkerHistory", "setBiomarkerHistory")
content = content.replace("safeSetActions", "setActions")
content = content.replace("safeSetDailyBenefits", "setDailyBenefits")
content = content.replace("safeSetReport", "setReport")
content = content.replace("safeSetTimeout", "setTimeout")
content = content.replace("safeSetInterval", "setInterval")
content = content.replace("safeSetIsAuthChecking", "setIsAuthChecking")
content = content.replace("safeSetSyncState", "setSyncState")
content = content.replace("safeSetActiveTab", "setActiveTab")
content = content.replace("safeSetDoc", "setDoc")
content = content.replace("safeSetShowSnapshotPanel", "setShowSnapshotPanel")
content = content.replace("safeSetAutoSyncDisabled", "setAutoSyncDisabled")
content = content.replace("safeSetHideSensitive", "setHideSensitive")

# Wait, `safeGetItem`?
content = content.replace("safeGetItem", "getItem")
content = content.replace("safeSetItem", "setItem")

# Basically `safeGet` and `safeSet` matching word boundary:
content = re.sub(r'safeGet([A-Z]\w*)', r'get\1', content)
content = re.sub(r'safeSet([A-Z]\w*)', r'set\1', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
