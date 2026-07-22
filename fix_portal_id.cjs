const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Add id to CustomFontSelect portal
code = code.replace(
  '<div \n            className="fixed z-[160]',
  '<div id="font-select-portal" \n            className="fixed z-[160]'
);
// Also add an id to the overlay
code = code.replace(
  '<div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)} />',
  '<div id="font-select-overlay" className="fixed inset-0 z-[150]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />'
);

// Update global click handler
code = code.replace(
  "if ((e.target as Element).closest('#theme-customizer-screen')) {",
  `if ((e.target as Element).closest('#theme-customizer-screen') || (e.target as Element).closest('#font-select-portal') || (e.target as Element).closest('#font-select-overlay')) {`
);

fs.writeFileSync('src/components/Header.tsx', code);
