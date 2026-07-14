const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /OMIT comparisonTable entirely\. Set it to null\. The backend will auto-generate it\./g,
  'OMIT comparisonTable entirely. Set it to null. The backend will auto-generate it. DO NOT OMIT ANY ITEMS. If the scout returned 20 items, your array MUST have exactly 20 items. Do not stop early. Do not group them.'
);

fs.writeFileSync('server.ts', code);
console.log('Exhaustive prompt patched');
