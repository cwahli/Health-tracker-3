const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

code = code.replace(
  `      if ((e.target as Element).closest('#theme-customizer-screen') || (e.target as Element).closest('#inspector-popup')) return;`,
  `      if ((e.target as Element).closest('#theme-customizer-screen')) {
        setInspectedElement(null);
        return;
      }
      if ((e.target as Element).closest('#inspector-popup')) return;`
);

fs.writeFileSync('src/components/Header.tsx', code);
