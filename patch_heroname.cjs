const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const oldStr = `const heroSearchName = itemObj?.originalName || itemObj?.name || group.groupName;`;
const newStr = `const heroSearchName = matchingScout?.originalName || itemObj?.originalName || matchingScout?.keyword || itemObj?.name || group.groupName;`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  console.log("Success patch heroname");
} else {
  console.log("Failed patch heroname");
}

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
