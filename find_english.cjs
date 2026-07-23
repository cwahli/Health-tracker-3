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
  'src/App.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // Find texts inside JSX tags that are not expressions { ... }
      const match = line.match(/>([^<{}]+)</g);
      if (match) {
        match.forEach(m => {
          const text = m.substring(1, m.length - 1).trim();
          if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('nbsp')) {
            console.log(`${file}:${i+1} : ${text}`);
          }
        });
      }
    });
  }
});
