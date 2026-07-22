const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// I'll just change `.join('\n')` to `.join('\\n')` for all occurrences of `.join('` newline
code = code.replace(/\.join\('\n/g, ".join('\\n");
code = code.replace(/text\.split\('\n/g, "text.split('\\n");

fs.writeFileSync('src/components/Header.tsx', code);
