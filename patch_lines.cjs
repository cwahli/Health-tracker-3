const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');

const newBlock = `MODE D: EVALUATION / COMPARISON
Triggered ONLY when explicitly evaluating alternative foods (e.g. comparing snacks), OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster".

- NUTRITIONAL DOMINANCE LAW (CRITICAL): You MUST group items strictly by their clinical nutritional value, primary base ingredient, or risk profile. You are strictly FORBIDDEN from creating groups named after physical layout locations like shelves, rows, or tables (e.g., Do NOT use 'Top Shelf Selections').

- CROSS-SHELF INDEX MAPPING (THE BREAKOUT RULE): Because the Vision Scout groups foods by physical rows to preserve bounding boxes, a single physical row may contain multiple types of foods. 
  * You are allowed to include the SAME Scout Index in MULTIPLE nutritional groups if that physical shelf contains products belonging to both categories.
  * Your UI will seamlessly render the correct row crop for both comparisons without breaking.

- COVERAGE REQUIREMENT: Every single Index provided in the === VISUAL FOOD SCOUT IDENTIFIED ITEMS === list MUST appear in at least one nutritional group.

- THE EVALUATION HIERARCHY (CRITICAL): Before grouping, you MUST evaluate the TOTAL package payload of every item against this strict 3-step hierarchy:
  1. UNIVERSAL THREATS: Does it contain universally harmful ingredients (e.g., trans fats)?
  2. THE DAILY BUDGET (ACUTE THREATS): Does the TOTAL package payload consume more than 50% of ANY "REMAINING NUTRITIONAL TARGET LIMIT" (e.g., Sodium, Calories, Saturated Fat)? If yes, it is an acute dietary threat.
  3. BIOMARKER STRATEGY (CHRONIC THREATS): Does the biochemical nature of the food trigger any of the specific "PATIENT BIOMARKER WARNINGS"?

- GROUPING STRATEGY (STRICT):
  Create exactly as many groups as are clinically necessary based on the Evaluation Hierarchy above—no more, no less.
  * DYNAMIC GROUP COUNT: Do NOT arbitrarily split items. If multiple items trigger the EXACT same hierarchy threat (e.g., two items both breach the 50% daily sodium limit, OR two items both trigger a chronic cholesterol warning without breaching daily limits), group them together. 
  * THE DIVERGENCE RULE: You MUST split items into separate groups ONLY if their primary hierarchy threats differ. (e.g., If Item A breaches the 50% Daily Sodium budget, but Item B fits the budget but triggers a chronic Qdiabetes biomarker warning due to sugar, you MUST separate them. Do not lump an acute budget threat with a chronic biomarker threat).
  * Set "groupName" to a descriptive title targeting the specific threat or benefit (e.g., "Critical Sodium Warning (Acute)", "Safe for Lipid Profile", "High Sugar/Diabetes Risk").
  * Set "scoutItemIndices" to an array of all shelf indices that contain those specific types of food.
  * CRITICAL MATH REQUIREMENT: When evaluating items that provide a 'rawNutritionLabel', you MUST multiply the per-serving nutrients by the total package 'estimatedWeightGrams' (divided by serving size) to determine the TOTAL nutritional payload. Your 'averageNutrients', 'pros', and 'cons' MUST reflect the TOTAL values for the whole package.

- SPECIFICITY FOR PROS/CONS (STRICT): Your 'pros' and 'cons' descriptions for each group must be highly specific and driven strictly by the hierarchy.
  * CLINICAL BLANKING: You do NOT have to fill both. If a group is clinically dangerous, set "pros" to "None for your clinical profile." Do not invent a "pro" (like praising protein) for a food that violates a high-risk biomarker or budget limit. If a group is perfectly healthy, set "cons" to "None."
  * NO AVERAGING EXTREMES: When grouping multiple items, you MUST use absolute ranges (e.g., '12g - 38g of sugar') rather than averages if there is a wide variance. Never use an average that masks a dangerous outlier. 
  * Set "topConcernNutrient" to the single nutrient defining that group's clinical threat or benefit.
  * Set "keyDifferentiator" to a short sentence contrasting this group against the others in the context of the patient's hierarchy threats.

- SCHEMA DETAILS:
  * Output the specific groups in comparison.groups. Rank the groups best-to-worst for this patient's specific biomarker and budget profile.
  * For each group, provide groupName, suitability, pros (MUST contain numeric macro values/ranges), cons (MUST contain numeric macro values/ranges), topConcernNutrient, keyDifferentiator, averageNutrients, and scoutItemIndices (or itemNames for text-only comparisons). OMIT the comparisonTable entirely.`;

// Replace lines 442 to 467 (1-indexed) which are indices 441 to 466.
lines.splice(441, 467 - 442 + 1, ...newBlock.split('\n'));

fs.writeFileSync('server.ts', lines.join('\n'));
console.log("Patched MODE D by line index!");
