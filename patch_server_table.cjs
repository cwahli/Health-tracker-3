const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(comparisonData && Array\.isArray\(comparisonData\.foods\)\) \{[\s\S]*?comparisonData\.comparisonTable = \{[\s\S]*?\};\s*\}/;
code = code.replace(regex, '');

fs.writeFileSync('server.ts', code);
console.log('server.ts table removed');
