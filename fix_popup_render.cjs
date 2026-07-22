const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');
code = code.replace('{inspectedElement && createPortal((', '{themePreviewMode && inspectedElement && createPortal((');
fs.writeFileSync('src/components/Header.tsx', code);
