const fs = require('fs');
let content = fs.readFileSync('src/components/AgentResultTable.tsx', 'utf8');

// Patch 1: isNewInHistory
content = content.replace(
  /const existingEntries = \(biomarkerHistory \|\| \[\]\)\.filter\(\(h: any\) => h\.biomarkers\?\.\[key\] !== undefined\);\n          const customDef = profile\?\.customBiomarkers\?\.\[key\];/g,
  `const existingEntries = (biomarkerHistory || []).filter((h: any) => h.biomarkers?.[key] !== undefined);
          const hasLegacyProfileData = profile?.biomarkers?.[key] !== undefined;
          const customDef = profile?.customBiomarkers?.[key];`
);

content = content.replace(
  /const isNewInHistory = existingEntries\.length === 0;/g,
  `const isNewInHistory = existingEntries.length === 0 && !hasLegacyProfileData;`
);

// Patch 2: isNew for fallback loop
content = content.replace(
  /const existingEntries = \(biomarkerHistory \|\| \[\]\)\.filter\(\(h: any\) => h\.biomarkers\?\.\[key\] !== undefined\);\n        let isNew = row\.noChangeNeeded \? false : \(existingEntries\.length === 0\);/g,
  `const existingEntries = (biomarkerHistory || []).filter((h: any) => h.biomarkers?.[key] !== undefined);
        const hasLegacyProfileData = profile?.biomarkers?.[key] !== undefined;
        let isNew = row.noChangeNeeded ? false : (existingEntries.length === 0 && !hasLegacyProfileData);`
);

content = content.replace(
  /isNewBiomarker: isNew && \(existingEntries\.length === 0\)/g,
  `isNewBiomarker: isNew && existingEntries.length === 0 && !hasLegacyProfileData`
);

fs.writeFileSync('src/components/AgentResultTable.tsx', content);
console.log("Patched AgentResultTable.tsx successfully.");
