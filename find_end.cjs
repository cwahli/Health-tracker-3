const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const userMessageStart = logChat.indexOf("} else {\n              if (msg.content === 'Surprise me') return null;");
console.log(logChat.substring(userMessageStart - 200, userMessageStart + 100));
