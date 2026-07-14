const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = 'calculatedRows[6].values.push(`${fat} g`);';
const newCode = `calculatedRows[6].values.push(\`\${fat} g\`);

          // Ensure food.keyNutrients contains all calculated/fallback core nutrients
          if (!food.keyNutrients) food.keyNutrients = {};
          food.keyNutrients.calories = cal;
          food.keyNutrients.saturatedFat = satFat;
          food.keyNutrients.sodium = sod;
          food.keyNutrients.protein = prot;
          food.keyNutrients.carbohydrates = carb;
          food.keyNutrients.totalFat = fat;`;

code = code.replace(targetStr, newCode);
fs.writeFileSync('server.ts', code);
console.log('Server patched');
