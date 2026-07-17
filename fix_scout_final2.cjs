const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const searchStr = `- EXHAUSTIVENESS DIRECTIVE: Extract EVERY distinct food item, ingredient, or menu option visible up to your active density cap. Do not get lazy or stop early.`;
const replaceStr = `- EXHAUSTIVENESS DIRECTIVE (CRITICAL): Count the total number of distinct food items before extracting. You MUST extract EVERY distinct food item, ingredient, or menu option visible. Do not get lazy or stop early. Look closely for hidden, blurred, or secondary items. If there are 4 items, you MUST output 4 objects. Never merge items unless they are the exact same product.`;
code = code.replace(searchStr, replaceStr);
fs.writeFileSync('server.ts', code);
console.log('Fixed exhaustiveness directive');
