const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes("type ===") || line.includes("agentType ===")) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
