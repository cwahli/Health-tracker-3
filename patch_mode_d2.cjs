const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const isMenuScale = scoutContentType === "menu_or_poster" \|\| visionScoutItems\.length > 10;/g,
  'const isMenuScale = scoutContentType === "menu_or_poster";'
);

code = code.replace(
  /- - MODE D2 — MENU SCREENING \(Content Type is "menu_or_poster" or >10 items\):/g,
  '- - MODE D2 — MENU SCREENING (Content Type is "menu_or_poster"):'
);

// To fix horizontal scroll on desktop triggering back navigation, we can add overscroll-behavior-x: contain to the horizontal scrollable containers
fs.writeFileSync('server.ts', code);
console.log('Mode D2 patched');
