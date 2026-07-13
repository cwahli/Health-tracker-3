const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
console.log(code.match(/type === 'food'/g).length);
console.log(code.match(/agentType === 'agent1'/g).length);
