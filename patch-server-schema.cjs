const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const schemaDefRegex = /    const allBiomarkerKeys = Array\.from\(new Set\(\[\s*\.\.\.biomarkerDefinitions\.map\(d => d\.key\),\s*\.\.\.Object\.keys\(userProfile\?\.customBiomarkers \|\| \{\}\)\s*\]\)\);\s*const agent1Step1Schema = \{[\s\S]*?\}\s*\]\s*\}\s*\};\s*/;

const match = content.match(schemaDefRegex);
if (match) {
  content = content.replace(schemaDefRegex, '');
  content = content.replace(
    /    if \(agentType === "agent4"\) \{/,
    match[0] + '\n    if (agentType === "agent4") {'
  );
  fs.writeFileSync('server.ts', content);
} else {
  console.log("Could not find schema definition");
}
