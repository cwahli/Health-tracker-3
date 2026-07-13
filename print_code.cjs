const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
const foodIdeaStart = logChat.indexOf("{isAgent('food_idea') && msg.data?.pendingFoodIdeas && (");
const foodIdeaEnd = logChat.indexOf(")}", logChat.indexOf("/>", foodIdeaStart)) + 2;
console.log(logChat.substring(foodIdeaStart, foodIdeaEnd));
