const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const targetStr = `          newEntries.forEach((newE: any) => {
            if (!newE || typeof newE !== 'object') return;
            const newKey = String(newE.biomarker || newE.name || '').trim().toLowerCase();
            const newDate = String(newE.date || '').trim();
            const newVal = String(newE.value || '').trim();
            
            const isDuplicate = oldEntries.some((oldE: any) => {
              if (!oldE || typeof oldE !== 'object') return false;
              const oldKey = String(oldE.biomarker || oldE.name || '').trim().toLowerCase();
              const oldDate = String(oldE.date || '').trim();
              const oldVal = String(oldE.value || '').trim();
              return oldKey === newKey && oldDate === newDate && oldVal === newVal;
            });`;

const newStr = `          newEntries.forEach((newE: any) => {
            if (!newE || typeof newE !== 'object') return;
            const newKey = String(newE.biomarker || newE.name || '').trim().toLowerCase();
            const newDate = String(newE.date || '').trim();
            const newVal = String(newE.numeric_value !== undefined && newE.numeric_value !== null ? newE.numeric_value : (newE.qualitative_value || newE.value || '')).trim();
            
            const isDuplicate = oldEntries.some((oldE: any) => {
              if (!oldE || typeof oldE !== 'object') return false;
              const oldKey = String(oldE.biomarker || oldE.name || '').trim().toLowerCase();
              const oldDate = String(oldE.date || '').trim();
              const oldVal = String(oldE.numeric_value !== undefined && oldE.numeric_value !== null ? oldE.numeric_value : (oldE.qualitative_value || oldE.value || '')).trim();
              return oldKey === newKey && oldDate === newDate && oldVal === newVal;
            });`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/components/LogChat.tsx', content);
  console.log("Successfully patched LogChat deduplication");
} else {
  console.log("Could not find target string.");
}
