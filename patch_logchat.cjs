const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const oldStr1 = `          assistantMsg.data = {
            agentResult: resData,
            scoutItems: carryOverScoutItems
          };`;

const newStr1 = `          assistantMsg.data = {
            agentResult: resData,
            scoutItems: carryOverScoutItems,
            scoutContentType: resData.scoutContentType
          };`;

const oldStr2 = `          assistantMsg.data = { 
            pendingFoodLog: newFoodLog,
            scoutItems: resData.scoutItems || []
          };`;

const newStr2 = `          assistantMsg.data = { 
            pendingFoodLog: newFoodLog,
            scoutItems: resData.scoutItems || [],
            scoutContentType: resData.scoutContentType
          };`;

code = code.replace(oldStr1, newStr1);
code = code.replace(oldStr2, newStr2);
fs.writeFileSync('src/components/LogChat.tsx', code);
console.log("Patched LogChat.tsx!");
