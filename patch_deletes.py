import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replacement 1:
old1 = """        // Pre-compute deleted sets for robust merging
        const deletedFoods = new Set<string>([
          ...(cloudProfile?.deletedFoodLogIds || []),
          ...(localProfile?.deletedFoodLogIds || [])
        ]);
        const deletedBioLogs = new Set<string>([
          ...(cloudProfile?.deletedBiomarkerLogIds || []),
          ...(localProfile?.deletedBiomarkerLogIds || [])
        ]);
        const deletedCustomKeys = new Set<string>([
          ...(cloudProfile?.deletedCustomBiomarkerKeys || []),
          ...(localProfile?.deletedCustomBiomarkerKeys || [])
        ]);"""

new1 = """        // Pre-compute deleted maps with LWW for robust merging
        const mergeDeletes = (cloud: any = {}, local: any = {}) => {
          const merged = { ...cloud };
          for (const [k, v] of Object.entries(local)) {
            if (!merged[k] || (v as number) > merged[k]) merged[k] = v;
          }
          return merged;
        };
        const deletedFoods = mergeDeletes(cloudProfile?.deletedFoodLogIds, localProfile?.deletedFoodLogIds);
        const deletedBioLogs = mergeDeletes(cloudProfile?.deletedBiomarkerLogIds, localProfile?.deletedBiomarkerLogIds);
        const deletedCustomKeys = mergeDeletes(cloudProfile?.deletedCustomBiomarkerKeys, localProfile?.deletedCustomBiomarkerKeys);"""

content = content.replace(old1, new1)

# Replacement 2:
old2 = """        const sanitizedLocal = sanitizeAndCleanLogs(localBioHistory).filter(b => !deletedBioLogs.has(b.id));"""
new2 = """        const sanitizedLocal = sanitizeAndCleanLogs(localBioHistory).filter(b => !deletedBioLogs[b.id] || (b.updated_at || 0) > deletedBioLogs[b.id]);"""
content = content.replace(old2, new2)

# Replacement 3:
old3 = """            deletedFoodLogIds: Array.from(deletedFoods),
            deletedBiomarkerLogIds: Array.from(deletedBioLogs),
            deletedCustomBiomarkerKeys: Array.from(deletedCustomKeys),"""
new3 = """            deletedFoodLogIds: deletedFoods,
            deletedBiomarkerLogIds: deletedBioLogs,
            deletedCustomBiomarkerKeys: deletedCustomKeys,"""
content = content.replace(old3, new3)

# Replacement 4:
old4 = """              const isDeleted = deletedCustomKeys.has(k);"""
new4 = """              const isDeleted = !!deletedCustomKeys[k];"""
content = content.replace(old4, new4)

# Replacement 5:
old5 = """              if (Object.keys(cleanedBiomarkers).length === 0 && !log.note) {
                deletedBioLogs.add(log.id);
              }"""
new5 = """              if (Object.keys(cleanedBiomarkers).length === 0 && !log.note) {
                deletedBioLogs[log.id] = Date.now();
              }"""
content = content.replace(old5, new5)

# Replacement 6:
old6 = """          const filteredFoods = foods.filter(f => f.sync_state !== 'delete' && !deletedFoods.has(f.id));
          const filteredLocalFoods = localFoods.filter(f => f.sync_state !== 'delete' && !deletedFoods.has(f.id));
          const filteredBioHistory = sanitizedBioHistory.filter(b => b.sync_state !== 'delete' && !deletedBioLogs.has(b.id));
          const filteredLocalBioHistory = sanitizedLocalBioHistory.filter(b => b.sync_state !== 'delete' && !deletedBioLogs.has(b.id));"""
new6 = """          const filteredFoods = foods.filter(f => f.sync_state !== 'delete' && (!deletedFoods[f.id] || (f.updated_at || 0) > deletedFoods[f.id]));
          const filteredLocalFoods = localFoods.filter(f => f.sync_state !== 'delete' && (!deletedFoods[f.id] || (f.updated_at || 0) > deletedFoods[f.id]));
          const filteredBioHistory = sanitizedBioHistory.filter(b => b.sync_state !== 'delete' && (!deletedBioLogs[b.id] || (b.updated_at || 0) > deletedBioLogs[b.id]));
          const filteredLocalBioHistory = sanitizedLocalBioHistory.filter(b => b.sync_state !== 'delete' && (!deletedBioLogs[b.id] || (b.updated_at || 0) > deletedBioLogs[b.id]));"""
content = content.replace(old6, new6)

# Replacement 7: (For saveAndSync deletions later down in App.tsx)
old7 = """        const newDeletedCustomKeys = new Set(prev.deletedCustomBiomarkerKeys || []);
        newDeletedCustomKeys.add(key);"""
new7 = """        const newDeletedCustomKeys = { ...(prev.deletedCustomBiomarkerKeys || {}) };
        newDeletedCustomKeys[key] = Date.now();"""
content = content.replace(old7, new7)

# Replacement 8:
old8 = """        deletedCustomBiomarkerKeys: Array.from(newDeletedCustomKeys)"""
new8 = """        deletedCustomBiomarkerKeys: newDeletedCustomKeys"""
content = content.replace(old8, new8)

# Replacement 9:
old9 = """        const newDeletedFoods = new Set(prev.deletedFoodLogIds || []);
        newDeletedFoods.add(id);"""
new9 = """        const newDeletedFoods = { ...(prev.deletedFoodLogIds || {}) };
        newDeletedFoods[id] = Date.now();"""
content = content.replace(old9, new9)

# Replacement 10:
old10 = """        deletedFoodLogIds: Array.from(newDeletedFoods),"""
new10 = """        deletedFoodLogIds: newDeletedFoods,"""
content = content.replace(old10, new10)

# Replacement 11:
old11 = """        const newDeletedBioLogs = new Set(prev.deletedBiomarkerLogIds || []);
        newDeletedBioLogs.add(id);"""
new11 = """        const newDeletedBioLogs = { ...(prev.deletedBiomarkerLogIds || {}) };
        newDeletedBioLogs[id] = Date.now();"""
content = content.replace(old11, new11)

# Replacement 12:
old12 = """        deletedBiomarkerLogIds: Array.from(newDeletedBioLogs),"""
new12 = """        deletedBiomarkerLogIds: newDeletedBioLogs,"""
content = content.replace(old12, new12)

# Replacement 13:
old13 = """          const updatedFoods = prev.foodLogs.map(f => f.id === logId ? { ...f, sync_state: 'delete' as const } : f);
          const newDeletedFoods = new Set(prev.profile?.deletedFoodLogIds || []);
          newDeletedFoods.add(logId);"""
new13 = """          const updatedFoods = prev.foodLogs.map(f => f.id === logId ? { ...f, sync_state: 'delete' as const } : f);
          const newDeletedFoods = { ...(prev.profile?.deletedFoodLogIds || {}) };
          newDeletedFoods[logId] = Date.now();"""
content = content.replace(old13, new13)

# Replacement 14:
old14 = """            profile: prev.profile ? { ...prev.profile, deletedFoodLogIds: Array.from(newDeletedFoods) } : undefined"""
new14 = """            profile: prev.profile ? { ...prev.profile, deletedFoodLogIds: newDeletedFoods } : undefined"""
content = content.replace(old14, new14)


with open('src/App.tsx', 'w') as f:
    f.write(content)

