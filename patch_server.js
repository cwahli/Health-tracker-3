const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `- GROUPING STRATEGY (STRICT):
  Aim to create 2 to 4 distinct, highly differentiated clinical buckets based on the actual text names listed inside the 'originalName' fields of the scout payload. 
  * Set "groupName" to a descriptive nutritional title.
  * Set "scoutItemIndices" to an array of all shelf indices that contain those specific types of food.
  * CRITICAL MATH REQUIREMENT: When evaluating items that provide a 'rawNutritionLabel', you MUST multiply the per-serving nutrients by the total package 'estimatedWeightGrams' (divided by serving size) to determine the TOTAL nutritional payload. Your 'averageNutrients', 'pros', and 'cons' MUST reflect the TOTAL values for the whole package, not just a single serving.
  * Your 'pros' and 'cons' descriptions for each group must be highly specific, referencing exact numeric macro averages or ranges based on the total values (e.g., 'total saturated fat (avg Xg) and total sodium (avg Ymg)').
  * Set "topConcernNutrient" to the single nutrient defining that group's clinical threat or benefit.
  * Set "keyDifferentiator" to a short sentence contrasting this group against the others.`;

const replacement = `- GROUPING STRATEGY (STRICT):
  Create exactly as many groups as are clinically necessary based on the 'originalName', the nutrient payloads, AND the PATIENT CONTEXT PAYLOAD—no more, no less.
  * DYNAMIC GROUP COUNT: Do NOT arbitrarily split items. If multiple items pose the EXACT same threat to this specific patient's active biomarkers (e.g., they both violate the patient's elevated Cholesterol warnings), group them together. Two groups is perfectly acceptable if it accurately summarizes the choices for this patient.
  * PERSONALIZED DIVERGENCE RULE: You MUST split items into separate groups ONLY if they trigger completely different biomarker warnings for this specific patient. (e.g., If the patient has BOTH High Blood Pressure and High Qdiabetes risk, you must separate the 'High Sodium' threats from the 'High Sugar' threats. However, if an item is high in sodium but the patient has NO blood pressure/sodium warnings, do not force a separate bucket for it).
  * Set "groupName" to a descriptive title targeting the patient's specific condition (e.g., "Safe for Lipid Profile", "High Risk for ALT").
  * Set "scoutItemIndices" to an array of all shelf indices that contain those specific types of food.
  * CRITICAL MATH REQUIREMENT: When evaluating items that provide a 'rawNutritionLabel', you MUST multiply the per-serving nutrients by the total package 'estimatedWeightGrams' (divided by serving size) to determine the TOTAL nutritional payload. Your 'averageNutrients', 'pros', and 'cons' MUST reflect the TOTAL values for the whole package.
  * Your 'pros' and 'cons' descriptions for each group must be highly specific, referencing exact numeric macro averages or ranges based on the total values (e.g., 'total saturated fat (avg Xg) and total sodium (avg Ymg)').
  * Set "topConcernNutrient" to the single nutrient defining that group's clinical threat or benefit.
  * Set "keyDifferentiator" to a short sentence contrasting this group against the others in the context of the patient's biomarkers.`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("Patched grouping strategy!");
} else {
  console.log("Grouping strategy target not found!");
}

fs.writeFileSync('server.ts', content);
