const fs = require('fs');
let code = fs.readFileSync('src/components/InteractivePlacesMap.tsx', 'utf-8');

code = code.replace(/#6366f1/g, "var(--color-indigo-500)");
code = code.replace(/#f59e0b/g, "var(--color-amber-500)");
code = code.replace(/#3b82f6/g, "var(--color-indigo-500)");
fs.writeFileSync('src/components/InteractivePlacesMap.tsx', code);
