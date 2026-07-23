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

const getKeys = (loc) => {
  const k = new Set();
  let inLoc = false;
  let braceCount = 0;
  for (const line of content.split('\n')) {
    if (line.match(new RegExp(`^\\s*${loc}:\\s*\\{`))) {
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
      const m = line.match(/^\s*(['"]?)([a-zA-Z0-9_]+)\1\s*:/);
      if (m) {
        k.add(m[2]);
      }
    }
  }
  return k;
}

const keys = {
  en: getKeys('en'),
  fr: getKeys('fr'),
  zh: getKeys('zh'),
  id: getKeys('id'),
};

const allMissing = [];

const checkKey = (key, file, line) => {
  const missingIn = [];
  ['en', 'fr', 'zh', 'id'].forEach(l => {
    if (!keys[l].has(key)) missingIn.push(l);
  });
  if (missingIn.length > 0) {
    allMissing.push(`${file}:${line} - t.${key} is missing in locales: ${missingIn.join(', ')}`);
  }
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const fContent = fs.readFileSync(file, 'utf8');
  fContent.split('\n').forEach((line, i) => {
    let match;
    const r1 = /t\.([a-zA-Z0-9_]+)/g;
    while ((match = r1.exec(line)) !== null) {
      checkKey(match[1], file, i+1);
    }
    const r2 = /t\[(['"])([a-zA-Z0-9_]+)\1\]/g;
    while ((match = r2.exec(line)) !== null) {
      checkKey(match[2], file, i+1);
    }
    const r3 = /translations\.([a-zA-Z0-9_]+)/g;
    while ((match = r3.exec(line)) !== null) {
      checkKey(match[1], file, i+1);
    }
    const r4 = /translations\[language[^\]]*\]\.([a-zA-Z0-9_]+)/g;
    while ((match = r4.exec(line)) !== null) {
      checkKey(match[1], file, i+1);
    }
  });
}

const dedup = [...new Set(allMissing)];
console.log(dedup.join('\n'));

