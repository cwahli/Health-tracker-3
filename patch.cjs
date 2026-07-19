const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `            // Bidirectional merge for food logs: server is the source of truth for synced items,
            // local items missing from the server are preserved and pushed.
            // Start from all server items (covers items added on other devices)
            mergedFoods = [...filteredFoods];

            // Add or update with ALL local items that aren't on the server
            filteredLocalFoods.forEach(localItem => {
              const existingIdx = mergedFoods.findIndex(m => m.id === localItem.id);
              if (existingIdx >= 0) {
                // Keep whichever is newer
                if ((localItem.updated_at || 0) >= (mergedFoods[existingIdx].updated_at || 0)) {
                  mergedFoods[existingIdx] = {
                    ...mergedFoods[existingIdx],
                    ...localItem,
                    imageUrl: localItem.imageUrl || mergedFoods[existingIdx].imageUrl,
                    imageUrls: (localItem.imageUrls && localItem.imageUrls.length > 0) ? localItem.imageUrls : mergedFoods[existingIdx].imageUrls,
                  };
                }
              } else {
                // Local item not on server yet — keep it and mark for sync
                mergedFoods.push({ ...localItem, sync_state: 'pending' });
              }
            });

            // Bidirectional merge for biomarker history: server is the source of truth for synced items,
            // local items missing from the server are preserved and pushed.
            // Start from all server items (covers items added on other devices)
            mergedBioHistory = [...filteredBioHistory];

            // Add or update with ALL local items that aren't on the server
            filteredLocalBioHistory.forEach(localItem => {
              const existingIdx = mergedBioHistory.findIndex(m => m.id === localItem.id);
              if (existingIdx >= 0) {
                // Keep whichever is newer
                if ((localItem.updated_at || 0) >= (mergedBioHistory[existingIdx].updated_at || 0)) {
                  mergedBioHistory[existingIdx] = {
                    ...mergedBioHistory[existingIdx],
                    ...localItem,
                    biomarkers: { ...mergedBioHistory[existingIdx].biomarkers, ...localItem.biomarkers }
                  };
                }
              } else {
                // Local item not on server yet — keep it and mark for sync
                mergedBioHistory.push({ ...localItem, sync_state: 'pending' });
              }
            });`;

content = content.replace(/\s*\/\/ Bidirectional merge for food logs: server is the source of truth for synced items,[\s\S]*?\/\/ Local item not on server yet — keep it\s*mergedBioHistory\.push\(localItem\);\s*\}\s*\}\);\s*/, '\n' + replacement + '\n            ');

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
