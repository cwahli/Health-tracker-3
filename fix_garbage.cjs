const fs = require('fs');
const filepath = 'server.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace('`;ing wrappers like json.', '`;');
fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed garbage in server.ts');
