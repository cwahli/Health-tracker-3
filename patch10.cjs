const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const titleStart = code.indexOf('<h2 className="text-sm font-bold text-slate-950 dark:text-slate-100 font-display">');
const titleEnd = code.indexOf('</h2>', titleStart);
const titleBlock = code.substring(titleStart, titleEnd + 5);

console.log(titleBlock);
