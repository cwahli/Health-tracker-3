const fs = require('fs');

const filesToPatch = [
  'src/components/LogChat.tsx',
  'src/components/ReviewBiomarkerModal.tsx'
];

const properties = [
  'pendingFoodLog',
  'pendingFoodIdeas',
  'pendingBiomarkers',
  'pendingBiomarkerEntries',
  'pendingCustomBiomarkerDefs',
  'proposal',
  'bucketMapping',
  'agentResult'
];

for (const file of filesToPatch) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Basic replacements for reading
  for (const prop of properties) {
    code = code.replace(new RegExp(`msg\\.${prop}`, 'g'), `msg.data?.${prop}`);
    code = code.replace(new RegExp(`message\\.${prop}`, 'g'), `message.data?.${prop}`);
    code = code.replace(new RegExp(`m\\.${prop}`, 'g'), `m.data?.${prop}`);
    code = code.replace(new RegExp(`msg\\.data\\?\\.${prop}\\?`, 'g'), `msg.data?.${prop}?`); // In case it gets duplicated
    code = code.replace(new RegExp(`msg\\.data\\?\\.data\\?\\.${prop}`, 'g'), `msg.data?.${prop}`);
    
    // writing
    // { ...msg, pendingFoodLog: ... } -> { ...msg, data: { ...msg.data, pendingFoodLog: ... } }
    // It's tricky with regex, we can just look for assignments.
    // e.g. `pendingFoodLog: ` -> `data: { ...msg.data, pendingFoodLog: `
  }
  
  fs.writeFileSync(file, code);
}
