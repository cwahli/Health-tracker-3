const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const targetStr = `    const img = new Image();
    
    img.onload = () => {`;

const newCode = `    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for CORS if image is external
    
    img.onload = () => {`;

code = code.replace(targetStr, newCode);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard canvas patched');
