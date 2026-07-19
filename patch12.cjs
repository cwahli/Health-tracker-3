const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          const recoveredFoods = [];
          const recoveredBio = [];`;

const replacement = `          const recoveredFoods: any[] = [];
          const recoveredBio: any[] = [];`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched array types");
