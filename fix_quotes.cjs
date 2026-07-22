const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

code = code.replace(/\.join\('\n'\)/g, ".join('\\n')");
code = code.replace(/\`\[\$\{l\.timestamp\}\]\n\$\{l\.message\}\`/g, "`[${l.timestamp}] \\n${l.message}`");

fs.writeFileSync('src/components/Header.tsx', code);
