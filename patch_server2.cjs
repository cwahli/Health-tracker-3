const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Include comparisonTable ONLY if comparing > 15 items\./g, 'OMIT comparisonTable entirely. Set it to null. The backend will auto-generate it.');

fs.writeFileSync('server.ts', code);
console.log('Server prompt patched');
