const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/comparison: comparisonData,\n        agentPrompt: fullPromptSent\n      \}\);/g, 'comparison: comparisonData,\n        agentPrompt: fullPromptSent,\n        scoutItems: visionScoutItems || []\n      });');

fs.writeFileSync('server.ts', code);
console.log('Server scoutItems patched');
