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

const content = fs.readFileSync('src/utils/translations.ts', 'utf8');
const enKeys = new Set();
let inLoc = false;
let braceCount = 0;
const lines = content.split('\n');
for (const line of lines) {
  if (line.match(/^\s*en:\s*\{/)) {
    inLoc = true;
    braceCount = 1;
    continue;
  }
  if (inLoc) {
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount <= 0) {
      inLoc = false;
      continue;
    }
    const keyMatch = line.match(/^\s*(['"]?)([a-zA-Z0-9_]+)\1\s*:/);
    if (keyMatch) {
      enKeys.add(keyMatch[2]);
    }
  }
}

console.log("Found", enKeys.size, "keys in en");

const usedKeys = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const fContent = fs.readFileSync(file, 'utf8');
  
  // match t.someKey or t['someKey'] or t["someKey"]
  const regex1 = /t\.([a-zA-Z0-9_]+)/g;
  const regex2 = /t\[(['"])([a-zA-Z0-9_]+)\1\]/g;
  const regex3 = /translations\.([a-zA-Z0-9_]+)/g;
  const regex4 = /translations\[language\w*\]\.([a-zA-Z0-9_]+)/g;
  
  let match;
  while ((match = regex1.exec(fContent)) !== null) {
    if (match[1] === 'en' || match[1] === 'fr' || match[1] === 'zh' || match[1] === 'id') continue;
    usedKeys.push({ file, key: match[1], type: 't.key' });
  }
  while ((match = regex2.exec(fContent)) !== null) {
    usedKeys.push({ file, key: match[2], type: 't[key]' });
  }
}

const missing = [];
usedKeys.forEach(({ file, key }) => {
  if (!enKeys.has(key)) {
    missing.push({ file, key });
  }
});

console.log("Missing keys:");
console.log(missing);
