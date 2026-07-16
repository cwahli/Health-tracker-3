const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

if (!code.includes('import { trackApiCall }')) {
  code = "import { trackApiCall } from '../../utils/apiTracker';\n" + code;
}

if (!code.includes('trackApiCall(\'brave\'')) {
  code = code.replace(
    /const response = await fetch\("\/api\/gemini\/food-image-search", \{/,
    `trackApiCall('brave', \`Brave Image Search (Manual) - \${query}\`);\n      const response = await fetch("/api/gemini/food-image-search", {`
  );
}

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
