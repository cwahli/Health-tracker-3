const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Match single quote, any newlines, single quote
code = code.replace(/'\r?\n'/g, "'\\\\n'");
code = code.replace(/"\r?\n"/g, '"\\\\n"');
code = code.replace(/\/\r?\n\//g, '/\\\\n/');

fs.writeFileSync('src/components/LogChat.tsx', code);
