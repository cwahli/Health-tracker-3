const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const injection = `        onSaveProfile={(updatedP) => {
          setProfile(updatedP);
          saveAndSync(updatedP, foodLogs, biomarkers, biomarkerHistory, actions, dailyBenefits, report, { type: 'profile' });
        }}
        onAddBiomarkerLogs={async (logs) => {
          let updatedBiomarkers = { ...biomarkers };
          let updatedHistory = [...biomarkerHistory];
          logs.forEach(log => {
            updatedBiomarkers[log.biomarker] = log.value;
            updatedHistory.push({
              id: \`bm_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
              biomarkers: { [log.biomarker]: log.value },
              date: log.date || new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString()
            });
          });
          setBiomarkers(updatedBiomarkers);
          setBiomarkerHistory(updatedHistory);
          await saveAndSync(profile, foodLogs, updatedBiomarkers, updatedHistory, actions, dailyBenefits, report, { type: 'biomarker', payload: logs });
        }}
`;

content = content.replace(/        onSaveProfile=\{\(updatedP\) => \{\n          setProfile\(updatedP\);\n          saveAndSync\(updatedP, foodLogs, biomarkers, biomarkerHistory, actions, dailyBenefits, report, \{ type: 'profile' \}\);\n        \}\}/, injection);

fs.writeFileSync('src/App.tsx', content);
