const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

code = code.replace(/\{\/\* Side-by-Side Comparison Matrix with highlighted suitability row \*\/\}[\s\S]*?<\/table>\s*<\/div>\s*<\/div>\s*\)\}/, '');

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard matrix removed');
