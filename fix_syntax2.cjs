const fs = require('fs');

function replaceFile(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(file, code);
}

replaceFile('src/components/ReviewBiomarkerModal.tsx', [
  [
    /data: \{\s*pendingBiomarkers: data\.pendingBiomarkers \|\| \(data\.proposedValue !== undefined && data\.proposedValue !== null \? \{ \[biomarkerKey\]: data\.proposedValue \} : undefined\),\s*proposal: data\.proposal \|\| undefined,\s*agentResult: \{ agentPrompt: data\.agentPrompt \},\s*\},/m,
    `pendingBiomarkers: data.pendingBiomarkers || (data.proposedValue !== undefined && data.proposedValue !== null ? { [biomarkerKey]: data.proposedValue } : undefined),
        proposal: data.proposal || undefined,
        agentResult: { agentPrompt: data.agentPrompt },`
  ]
]);
