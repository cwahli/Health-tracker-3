const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
code = code.replace(/document\.querySelector\("textarea"\)\?\.focus\(\) \|\| document\.querySelector\("input"\)\?\.focus\(\)/g, 'document.getElementById("food-chat-input")?.focus()');
fs.writeFileSync('src/components/LogChat.tsx', code);
console.log('LogChat patched again');
