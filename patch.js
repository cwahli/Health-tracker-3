const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const regex = /{activeScoutItems\.some\(\(i: any\) => \(i\.nutritionFacts && Object\.keys\(i\.nutritionFacts\)\.length > 0\) \|\| \(i\.rawNutritionLabel && Object\.keys\(i\.rawNutritionLabel\)\.length > 0\)\) && \([\s\S]*?<\/div>\n                             \)}/m;

code = code.replace(regex, '<NutritionLabelTable activeScoutItems={activeScoutItems} />');
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
