const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const regex = /<button\s+type="button"\s+onClick=\{\(\) => \{[\s\S]*?className="mt-3 w-full px-3 py-2 bg-indigo-50[\s\S]*?>\s*<span>\+\s*Log this item<\/span>\s*<\/button>/g;

code = code.replace(regex, '');

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard Log button in comparison removed');
