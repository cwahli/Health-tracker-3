const fs = require('fs');

let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// 1. FoodIdeaCard
const foodIdeaStart = logChat.indexOf("{/* Render extracted Pending Food Log info */}");
const foodIdeaEnd = logChat.indexOf(")}", logChat.indexOf("</InteractivePlacesMap>")) + 2;
const foodIdeaCode = logChat.substring(foodIdeaStart, foodIdeaEnd);

// 2. FoodCard
const foodEvalCardStart = logChat.indexOf("{isAgent('food') && msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (");
const foodLogEnd = logChat.indexOf(")}", logChat.indexOf("{t.logThisFood}")) + 2;
let foodCardCode = logChat.substring(foodEvalCardStart, foodLogEnd);

// 3. BiomarkerCard
const biomarkerStart = logChat.indexOf("{/* Render Agent Result Blocks */}");
const biomarkerEnd = logChat.indexOf(")}", logChat.indexOf("Apply & Save Agent Findings")) + 2;
let biomarkerCode = logChat.substring(biomarkerStart, biomarkerEnd);

console.log("foodIdea extracted length:", foodIdeaCode.length);
console.log("foodCard extracted length:", foodCardCode.length);
console.log("biomarkerCode extracted length:", biomarkerCode.length);

