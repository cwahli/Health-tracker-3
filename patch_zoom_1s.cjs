const fs = require('fs');
let code = fs.readFileSync('src/components/ZoomableImage.tsx', 'utf8');

code = code.replace(
  /setTimeout\(\(\) => setHighlight\(false\), 2000\)/g,
  'setTimeout(() => setHighlight(false), 1000)'
);

code = code.replace(
  /'ring-\[6px\] ring-emerald-400 bg-emerald-400\/20 shadow-\[0_0_30px_rgba\(52,211,153,0\.5\)\]' : 'ring-2 ring-emerald-400\/50 bg-transparent'/g,
  "'opacity-100 ring-[6px] ring-emerald-400 bg-emerald-400/20 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : 'opacity-0'"
);

fs.writeFileSync('src/components/ZoomableImage.tsx', code);
console.log('ZoomableImage patched for 1s and disappear');
