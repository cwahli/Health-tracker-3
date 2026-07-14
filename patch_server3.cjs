const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/comparisonTable: \{\n              type: Type\.OBJECT,\n              nullable: true,/g, 'comparisonTable: {\n              type: Type.OBJECT,\n              nullable: true,\n              description: "Set to null. Backend auto-generates this.",');

fs.writeFileSync('server.ts', code);
console.log('Server schema patched');
