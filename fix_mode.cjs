const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let fixCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('root_v===')) {
    lines[i] = "2. TRACE NUTRIENTS: Do NOT estimate these individually. Instead, output the single most appropriate foodType string for each item (e.g., 'red_meat', 'leafy_veg', 'root_veg', etc.).";
    lines.splice(i+1, 0, "", "=== MODE ROUTING DIRECTIVE (STRICTLY ENFORCED) ===");
    fixCount++;
    break;
  }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('null.IT the comparisonTable entirely.')) {
    lines[i] = lines[i].replace('null.IT the comparisonTable entirely.', 'null.');
    fixCount++;
    break;
  }
}

fs.writeFileSync('server.ts', lines.join('\n'), 'utf8');
console.log('Fixed', fixCount, 'issues');
