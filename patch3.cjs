const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes("type === 'food'") || line.includes("type === 'medical'")) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
