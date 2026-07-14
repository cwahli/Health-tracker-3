const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /"keyNutrientConcern": "The specific nutrient string causing primary clinical concern",/g,
  '"keyNutrientConcern": "Comma-separated list of 2-3 most critical nutrients to monitor for this patient (e.g., \'Sodium, Saturated Fat, Calories\')",\n    "comparisonTitle": "A short 2-4 word title for this comparison (e.g., \'Nutrients of Concern\')", '
);

code = code.replace(
  /keyNutrientConcern: \{ type: Type\.STRING \},/g,
  'keyNutrientConcern: { type: Type.STRING, description: "Comma-separated list of 2-3 most critical nutrients to monitor for this patient (e.g., \'Sodium, Saturated Fat, Calories\')" },\n            comparisonTitle: { type: Type.STRING, nullable: true },'
);

fs.writeFileSync('server.ts', code);
console.log('Patched keyNutrientConcern in schema');
