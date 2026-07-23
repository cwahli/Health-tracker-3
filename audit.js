const fs = require('fs');

const files = [
  'src/components/BottomNav.tsx',
  'src/components/HomeTab.tsx',
  'src/components/GoogleHealthIntegration.tsx',
  'src/components/chat-cards/FoodCard.tsx',
  'src/components/chat-cards/WelcomeCard.tsx',
  'src/components/chat-cards/HealthBaselineCard.tsx',
  'src/components/chat-cards/BiomarkerCard.tsx',
  'src/components/chat-cards/FoodEvaluationComparisonCard.tsx',
  'src/components/chat-cards/NutritionLabelTable.tsx',
  'src/App.tsx',
  'src/utils/translations.ts'
];

console.log("Checking for 'descriptions.en' being written to...");
for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('descriptions.en') && line.includes('=')) {
        console.log(`${file}:${i+1} Writing to descriptions.en`);
      }
      if (line.includes('descriptions: {') && lines[i+1] && lines[i+1].includes('en:')) {
        console.log(`${file}:${i+2} Writing to descriptions: { en: ... }`);
      }
    });
  }
}

