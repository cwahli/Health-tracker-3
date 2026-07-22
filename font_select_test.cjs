const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');
console.log(code.includes('CustomSelect'));
