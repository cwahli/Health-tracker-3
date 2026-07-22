const fs = require('fs');
let lines = fs.readFileSync('src/components/Header.tsx', 'utf-8').split('\n');

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('shadowScale')) {
    if (lines[i+1] && lines[i+1].includes('";')) {
      lines[i] = lines[i] + "\\n\";";
      lines.splice(i+1, 1);
    }
  }
}

fs.writeFileSync('src/components/Header.tsx', lines.join('\n'));
