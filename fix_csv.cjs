const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// I'll just write string replace
code = code.replace('shadowScale";', 'shadowScale\\n";');
code = code.replace('.join("");', '.join("\\n");');
code = code.replace("text.split('');", "text.split('\\n');");

fs.writeFileSync('src/components/Header.tsx', code);
