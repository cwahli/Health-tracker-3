const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

content = content.replace(
  /const cleanedOld = oldYamlStr\.replace\(\/\\`\\`\\`\(\?:yaml\|yml\|json\)\?\/gi, ''\)\.trim\(\);/g,
  "const cleanedOld = oldYamlStr.replace(/```(?:yaml|yml|json)?/gi, '').trim();"
);

content = content.replace(
  /const cleanedNew = newYamlStr\.replace\(\/\\`\\`\\`\(\?:yaml\|yml\|json\)\?\/gi, ''\)\.trim\(\);/g,
  "const cleanedNew = newYamlStr.replace(/```(?:yaml|yml|json)?/gi, '').trim();"
);

fs.writeFileSync('src/components/LogChat.tsx', content);
console.log("Fixed regex escaping");
