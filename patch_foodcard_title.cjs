const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

code = code.replace(
  /\{msg\.data\?\.agentResult\.comparison\.keyNutrientConcern \|\| 'Nutrients of Concern'\}/g,
  "{msg.data?.agentResult.comparison.comparisonTitle || msg.data?.agentResult.comparison.keyNutrientConcern || 'Nutrients of Concern'}"
);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard title patched');
