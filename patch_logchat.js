const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
code = code.replace(/onClick=\{\(\) => setInputText\("Evaluate new food"\)\}/g, 'onClick={() => { setInputText("Evaluate new food"); setTimeout(() => document.querySelector("input")?.focus(), 50); }}');
code = code.replace(/onClick=\{\(\) => setInputText\("Compare food items"\)\}/g, 'onClick={() => { setInputText("Compare food items"); setTimeout(() => document.querySelector("input")?.focus(), 50); }}');
fs.writeFileSync('src/components/LogChat.tsx', code);
console.log('LogChat patched');
