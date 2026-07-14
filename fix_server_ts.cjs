const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const promptStart = code.indexOf('MODE D: EVALUATION / COMPARISON');
const promptEnd = code.indexOf('JSON SCHEMA STRICT REQUIREMENT:');

if (promptStart > -1 && promptEnd > -1) {
  const newModeD = `MODE D: EVALUATION / COMPARISON
Triggered ONLY when explicitly evaluating alternative foods (e.g. comparing two snacks), OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster".
- CRITICAL: Do NOT use this mode for a standard meal photo or when the user says they ate something.
- EXHAUSTIVE DIRECTIVE: Group all identified food items into relevant buckets (groups) based on similar top nutrients (e.g., "Low Saturated Fat Options", "High Protein", "High Risk Items"). 
- Instead of showing weight, calorie, sat fat for each item individually, show them as an aggregate (average) for the group. 
- Output the specific groups in comparison.groups. Rank the groups best-to-worst.
- For each group, provide groupName, suitability, pros, cons, averageNutrients, and an items array containing just the name, targetDbId, boundingBox2D, and sourceImageIndex of each food in the group. OMIT the comparisonTable entirely.

`;
  
  code = code.substring(0, promptStart) + newModeD + code.substring(promptEnd);
  fs.writeFileSync('server.ts', code);
  console.log('Fixed server.ts mode D prompt');
} else {
  console.log('Could not find prompt boundaries');
}
