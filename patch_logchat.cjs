const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => \{ setInputText\("Evaluate new food"\); setTimeout\(\(\) => document\.getElementById\("food-chat-input"\)\?\.focus\(\), 50\); \}\}/,
  'onClick={() => { setInputText("I ate this meal"); setTimeout(() => document.getElementById("food-chat-input")?.focus(), 50); }}'
);

code = code.replace(
  /<span>🔍 Evaluate New Food<\/span>/,
  '<span>🔍 Review Meal</span>'
);

fs.writeFileSync('src/components/LogChat.tsx', code);
console.log('LogChat patched');
