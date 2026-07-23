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
];

const issues = [];

// 4. Check for descriptions.en
for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('descriptions.en') && line.includes('=')) {
        issues.push({ file, line: i+1, issue: "Hardcoded descriptions.en for writing" });
      }
      if (line.includes('descriptions: {') && lines[i+1] && lines[i+1].includes('en:')) {
        issues.push({ file, line: i+2, issue: "Hardcoded descriptions: { en: ... } for writing" });
      }
      // Also look for descriptions?.en
      if (line.includes('descriptions?.en') && line.includes('=')) {
        issues.push({ file, line: i+1, issue: "Hardcoded descriptions?.en for writing" });
      }
    });
  }
}

// 2. Check for missing translations
const translationsFile = 'src/utils/translations.ts';
if (fs.existsSync(translationsFile)) {
  const content = fs.readFileSync(translationsFile, 'utf8');
  // Simple regex to extract keys for each language. This might be brittle but let's try.
  // Actually, we can just require the file? It's TS.
}

console.log(JSON.stringify(issues, null, 2));
