const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const lines = code.split(/\r?\n/);
console.log(lines[75]);
console.log(lines[76]);
console.log(lines[77]);
