const fs = require('fs');
let code = fs.readFileSync('src/components/NutrientPieChart.tsx', 'utf-8');

code = code.replace(/#ef4444/g, "var(--color-rose-500)");
fs.writeFileSync('src/components/NutrientPieChart.tsx', code);
