const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

code = code.replace(/img\.crossOrigin = 'anonymous'; \/\/ Important for CORS if image is external/g, "if (baseImageSrc.startsWith('http')) { img.crossOrigin = 'anonymous'; }");

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('Canvas CORS fixed');
