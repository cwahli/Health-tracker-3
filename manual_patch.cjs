const fs = require('fs');

function replaceFile(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(file, code);
}

replaceFile('src/components/LogChat.tsx', [
  [/agentResult:  resData,/g, 'data: { ...(typeof msg !== "undefined" ? msg.data : {}), agentResult: resData },'],
  [/pendingFoodLog: \{/g, 'data: { ...(typeof newMsg !== "undefined" ? newMsg.data : {}), pendingFoodLog: {'],
  [/agentResult: \{/g, 'data: { ...(typeof newMsg !== "undefined" ? newMsg.data : typeof msg !== "undefined" ? msg.data : {}), agentResult: {'],
  // The first `agentResult: {` on line 1668 has 3 closing braces. Let's just cast to any!
]);

replaceFile('src/components/ReviewBiomarkerModal.tsx', [
  [
    /pendingBiomarkers: data\.pendingBiomarkers[\s\S]*?agentResult: \{ agentPrompt: data\.agentPrompt \},/m,
    `data: {
          pendingBiomarkers: data.pendingBiomarkers || (data.proposedValue !== undefined && data.proposedValue !== null ? { [biomarkerKey]: data.proposedValue } : undefined),
          proposal: data.proposal || undefined,
          agentResult: { agentPrompt: data.agentPrompt },
        },`
  ]
]);

