const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStr = `"cookingMethod": "string",`;
const newStr = `"cookingMethod": "string (Identify the cooking method and list any seasonings/sauces used, providing indication on the type of sauce and what sort of oil is being added or anything that can help the dietetician to make an accurate diagnostic)",`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  console.log("Success patch scout prompt");
} else {
  console.log("Failed patch scout prompt");
}

fs.writeFileSync('server.ts', code);
