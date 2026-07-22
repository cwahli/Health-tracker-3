const fs = require('fs');
let currentTypes = fs.readFileSync('src/types.ts', 'utf8');

// Replace any occurrence of number | string with any
currentTypes = currentTypes.replace(/number \| string/g, 'any');

fs.writeFileSync('src/types.ts', currentTypes);
console.log("Fixed types 5");
