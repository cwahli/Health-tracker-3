const fs = require('fs');
let code = fs.readFileSync('src/components/ZoomableImage.tsx', 'utf8');

code = code.replace(/maxScale=\{15\}/g, 'maxScale={40}');
code = code.replace(/const targetScale = Math\.min\(0\.9 \/ \(maxBboxSize \|\| 1\), 15\);/g, 'const targetScale = Math.min(0.95 / (maxBboxSize || 1), 40);');

fs.writeFileSync('src/components/ZoomableImage.tsx', code);
console.log('ZoomableImage patched');
