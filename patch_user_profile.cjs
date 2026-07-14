const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /export interface UserProfile \{/,
  'export interface UserProfile {\n  topNutrientsToMonitor?: string[];'
);

fs.writeFileSync('src/types.ts', code);
console.log('UserProfile patched with topNutrientsToMonitor');
