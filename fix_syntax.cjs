const fs = require('fs');

function replaceFile(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(file, code);
}

replaceFile('src/components/LogChat.tsx', [
  [/data: \{ \.\.\.\(typeof msg !== "undefined" \? msg\.data : \{\}\), agentResult: resData \},/g, 'agentResult: resData,'],
  [/data: \{ \.\.\.\(typeof newMsg !== "undefined" \? newMsg\.data : \{\}\), pendingFoodLog: \{/g, 'pendingFoodLog: {'],
  [/data: \{ \.\.\.\(typeof newMsg !== "undefined" \? newMsg\.data : typeof msg !== "undefined" \? msg\.data : \{\}\), agentResult: \{/g, 'agentResult: {'],
]);

fs.writeFileSync('src/types.ts', fs.readFileSync('src/types.ts', 'utf8').replace(/data\?: Record<string, any>;/, "data?: Record<string, any>;\n  pendingFoodLog?: any;\n  pendingFoodIdeas?: any;\n  pendingBiomarkers?: any;\n  pendingBiomarkerEntries?: any;\n  pendingCustomBiomarkerDefs?: any;\n  proposal?: any;\n  bucketMapping?: any;\n  agentResult?: any;"));

