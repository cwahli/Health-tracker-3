const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const modeAReplacement = `MODE A: NEW FOOD LOGGING 
- Triggered by a completely new food item description or image of a meal they ate/want to eat. Ignore CURRENT_ACTIVE_MEAL_STATE.
- Extract ingredients, estimate weights, and provide the "foodData" block. Set "mode": "new_log".
- CRITICAL: If the user uploads a picture of a meal (e.g. a plate with steak, potatoes, veggies), you MUST treat it as a single meal entry and use MODE A (NEW FOOD LOGGING). Combine the components into the itemsBreakdown array. DO NOT use MODE D (EVALUATION/COMPARISON) to compare the items on the plate unless the user explicitly asks to compare them or choose the best option.
- CRITICAL: If the user enters a single food item name without explicitly asking to compare, use MODE A.`;

code = code.replace(
  /MODE A: NEW FOOD LOGGING[\s\S]*?MODE B: DISCUSSION/,
  modeAReplacement + "\n\nMODE B: DISCUSSION"
);

const modeDReplacement = `MODE D: EVALUATION / COMPARISON
Triggered ONLY when explicitly evaluating alternative foods (e.g. comparing two snacks), changing active item weights, OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster". Do NOT use this mode for a standard meal photo.`;

code = code.replace(
  /MODE D: EVALUATION \/ COMPARISON[\s\S]*?Triggered when evaluating alternative foods, changing active item weights, OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster"\./,
  modeDReplacement
);

fs.writeFileSync('server.ts', code);
console.log('Mode routing patched');
