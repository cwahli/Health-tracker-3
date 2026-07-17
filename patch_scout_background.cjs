const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const oldStr = `* Background & Inventory Exclusion: Do NOT extract or weigh large bulk supplies, raw ingredients on store shelves, or street cart inventories visible in the background (e.g., a massive 3kg pile of oranges on a cart). If the user's text and the primary subject of the photo imply they are logging a single prepared portion, only extract the components of that specific meal.`;
const newStr = `* Background & Inventory Exclusion: Do NOT extract bulk store inventories in the background. HOWEVER, you MUST extract ALL items that are part of the user's meal on the table, including side dishes, drinks, small condiments, and separate plates. Never assume an item on the table is "background" if it is part of the meal setting.`;
code = code.replace(oldStr, newStr);
fs.writeFileSync('server.ts', code);
console.log('Fixed background exclusion rule');
