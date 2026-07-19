const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr2 = `                  let existingLogIndex = currentHistory.findIndex(h => h.date === entry.date);
                  if (existingLogIndex >= 0) {
                    currentHistory[existingLogIndex].biomarkers[bioName] = finalValue;
                  } else {
                    currentHistory.push({
                      id: \`log_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
                      date: entry.date,
                      biomarkers: { [bioName]: finalValue },
                      sync_state: 'new'
                    });
                  }`;

const replacementStr2 = `                  const entryDateStr = String(entry.date).split('T')[0];
                  let existingLogIndex = currentHistory.findIndex((h: any) => String(h.date || '').split('T')[0] === entryDateStr);
                  if (existingLogIndex >= 0) {
                    currentHistory[existingLogIndex].biomarkers[bioName] = finalValue;
                  } else {
                    currentHistory.push({
                      id: \`log_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
                      date: entry.date.includes('T') ? entry.date : entry.date + 'T12:00:00Z',
                      biomarkers: { [bioName]: finalValue },
                      sync_state: 'new'
                    });
                  }`;

content = content.replace(targetStr2, replacementStr2);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched onAgentFinish else branch date match");
