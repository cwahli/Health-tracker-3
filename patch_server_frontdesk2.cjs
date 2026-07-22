const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/app\.post\("\/api\/front-desk"/, 'app.post("/api/gemini/front-desk"');
content = content.replace(/res\.json\(\{ reply: reply\.replace[^\n]+\n/, `res.json({ text: reply.replace(/\\\`\\\`\\\`json[\\s\\S]*?\\\`\\\`\\\`/g, '').trim(), updatedProfile, newBiomarkerLogs, type: 'front_desk' });\n`);

fs.writeFileSync('server.ts', content);
