const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');
code = code.replace(/loggedMessageIds\.includes/g, "(loggedMessageIds || []).includes");
code = code.replace(/setLoggedMessageIds\(/g, "setLoggedMessageIds?.(");
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
