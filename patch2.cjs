const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/!loadedProfile\.metadata\.legacyMigrated/g, '!loadedProfile.metadata.legacyMigratedV2');
content = content.replace(/cloudAlreadyMigrated = true;/g, 'cloudAlreadyMigrated = !!cloudProfileSnap.data()?.metadata?.legacyMigratedV2;');
content = content.replace(/loadedProfile\.metadata\.legacyMigrated = true;/g, 'loadedProfile.metadata.legacyMigratedV2 = true; loadedProfile.metadata.legacyMigrated = true;');
content = content.replace(/legacyMigrated: true/g, 'legacyMigratedV2: true, legacyMigrated: true');

const targetMigration = `                if (filteredLegacyFoods.length > 0 || filteredLegacyHistory.length > 0) {
                  console.log(\`[Migration] Migrating \${filteredLegacyFoods.length} foods and \${filteredLegacyHistory.length} biomarker entries\`);
                  // Merge legacy into loaded states
                  const mergedFoods = [...loadedFoods];
                  filteredLegacyFoods.forEach(lf => {
                    if (!mergedFoods.some(f => f.id === lf.id)) {
                      mergedFoods.push(lf);
                    }
                  });
                  
                  const mergedHistory = [...loadedHistory];
                  filteredLegacyHistory.forEach(lh => {
                    if (!mergedHistory.some(h => h.id === lh.id)) {
                      mergedHistory.push(lh);
                    }
                  });`;

const replacementMigration = `                if (filteredLegacyFoods.length > 0 || filteredLegacyHistory.length > 0) {
                  console.log(\`[Migration] Migrating \${filteredLegacyFoods.length} foods and \${filteredLegacyHistory.length} biomarker entries\`);
                  // Merge legacy into loaded states, FORCE sync_state to pending so time buckets picks them up
                  const mergedFoods = [...loadedFoods];
                  filteredLegacyFoods.forEach(lf => {
                    const existingIdx = mergedFoods.findIndex(f => f.id === lf.id);
                    if (existingIdx === -1) {
                      mergedFoods.push({ ...lf, sync_state: 'pending' });
                    } else {
                      mergedFoods[existingIdx] = { ...mergedFoods[existingIdx], sync_state: 'pending' };
                    }
                  });
                  
                  const mergedHistory = [...loadedHistory];
                  filteredLegacyHistory.forEach(lh => {
                    const existingIdx = mergedHistory.findIndex(h => h.id === lh.id);
                    if (existingIdx === -1) {
                      mergedHistory.push({ ...lh, sync_state: 'pending' });
                    } else {
                      mergedHistory[existingIdx] = { ...mergedHistory[existingIdx], sync_state: 'pending' };
                    }
                  });`;

content = content.replace(targetMigration, replacementMigration);
fs.writeFileSync('src/App.tsx', content);
console.log("Success");
