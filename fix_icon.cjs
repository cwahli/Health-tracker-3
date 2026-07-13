const fs = require('fs');
let code = fs.readFileSync('src/components/AgentResultViews.tsx', 'utf8');

code = code.replace("import { getNutrientIcon } from '../utils/nutrition';", "");

const getNutrientIconBlock = `
const getNutrientIcon = (key: string) => {
  return <Apple className="w-3.5 h-3.5 text-emerald-500" />;
};
`;

code = code.replace("const safeParseResult =", getNutrientIconBlock + "\nconst safeParseResult =");

fs.writeFileSync('src/components/AgentResultViews.tsx', code);
