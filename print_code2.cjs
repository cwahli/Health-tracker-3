const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const foodEvalCardStart = logChat.indexOf("{isAgent('food') && msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (");
const foodLogEnd = logChat.indexOf(")}", logChat.indexOf("{t.logThisFood}")) + 2;
console.log(logChat.substring(foodEvalCardStart, foodEvalCardStart + 500));
console.log("----- END -----");
console.log(logChat.substring(foodLogEnd - 500, foodLogEnd));
