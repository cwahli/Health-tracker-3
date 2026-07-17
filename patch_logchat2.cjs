const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

code = code.replace(/debouncedSaveConversation\(newId, \[welcome\], null\);\s*/g, '');
code = code.replace(
  /if \(activeConversationId && messages && messages\.length > 0\)/g,
  'if (activeConversationId && messages && messages.length > 1)'
);

fs.writeFileSync('src/components/LogChat.tsx', code);
console.log('LogChat patched');
