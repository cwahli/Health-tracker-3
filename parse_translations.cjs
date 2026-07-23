const fs = require('fs');

const content = fs.readFileSync('src/utils/translations.ts', 'utf8');

const locales = ['en', 'fr', 'zh', 'id'];
const keys = {};

locales.forEach(loc => {
  keys[loc] = new Set();
  const regex = new RegExp(`${loc}:\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = content.match(regex);
  if (match) {
    // extract keys
    const lines = match[1].split('\n');
    lines.forEach(line => {
      const keyMatch = line.match(/^\s*(['"]?)([a-zA-Z0-9_]+)\1\s*:/);
      if (keyMatch) {
        keys[loc].add(keyMatch[2]);
      }
    });
  } else {
    // If it's a huge object, maybe regex failed. Let's do a different way
    let inLoc = false;
    let braceCount = 0;
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.match(new RegExp(`^\\s*${loc}:\\s*\\{`))) {
        inLoc = true;
        braceCount = 1;
        continue;
      }
      if (inLoc) {
        // count braces
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        if (braceCount <= 0) {
          inLoc = false;
          continue;
        }
        const keyMatch = line.match(/^\s*(['"]?)([a-zA-Z0-9_]+)\1\s*:/);
        if (keyMatch) {
          keys[loc].add(keyMatch[2]);
        }
      }
    }
  }
});

const enKeys = Array.from(keys.en);
const missing = [];

enKeys.forEach(key => {
  locales.forEach(loc => {
    if (loc !== 'en' && !keys[loc].has(key)) {
      missing.push({ key, locale: loc });
    }
  });
});

console.log("Missing translations:");
console.log(missing);

