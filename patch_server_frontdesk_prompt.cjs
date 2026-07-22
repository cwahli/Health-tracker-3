const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/res\.json\(\{ text: reply/, "res.json({ agentPrompt: prompt, text: reply");
fs.writeFileSync('server.ts', content);
