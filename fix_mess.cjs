const fs = require('fs');

const filesToPatch = [
  'src/components/LogChat.tsx',
  'src/components/ReviewBiomarkerModal.tsx'
];

for (const file of filesToPatch) {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(/data: \{ \.\.\.\(\(typeof msg !== 'undefined' \? msg : typeof message !== 'undefined' \? message : \{\}\)\.data \|\| \{\}\), agentResult:([\s\S]*?) \},/g, "agentResult:$1,");
  
  fs.writeFileSync(file, code);
}
