const fs = require('fs');

let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

code = code.replace(/setMessages\(nextSess\.messages \|\| \[\]\);/g, 'setMessages(migrateMessages(nextSess.messages || []));');
code = code.replace(/setMessages\(found\.messages \|\| \[\]\);/g, 'setMessages(migrateMessages(found.messages || []));');

fs.writeFileSync('src/components/LogChat.tsx', code);
