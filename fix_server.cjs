const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(/res\.json\(\{ reply: reply\.replace\(\/\\`\\`\\`json\[\\\\s\\\\S\]\*?\\`\\`\\`\/g, ''\)\.trim\(\), updatedProfile \}\);/, 
  "res.json({ reply: reply.replace(/```json[\\s\\S]*?```/g, '').trim(), updatedProfile });"
);
fs.writeFileSync('server.ts', content);
