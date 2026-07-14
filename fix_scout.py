import re

with open('server.ts', 'r') as f:
    content = f.read()

scout_replacement = """        const scoutSystemInstruction = `You are a fast visual food identification and localization agent. You will receive one or more images.

STEP 1 — IMAGE CLASSIFICATION (do this FIRST for every image):
For each image, determine if it is:
  (a) A product label, price tag, or packaging showing food name and/or weight in grams/kg
  (b) A Nutrition Facts label
  (c) An actual food photo showing prepared or raw ingredients
  (d) A cooking scene (e.g. boiling in a pot, frying on a pan)

STEP 2 — DATA EXTRACTION & LOCALIZATION:
- For product/price labels (type a): Read the EXACT food name and weight. Convert kg to grams. Translate local name to English.
- For Nutrition Facts labels (type b): Read the exact macros. Calculate and provide the values PER 100g (or just extract them if already per 100g) so the dietitian can use them accurately.
- For food photos (type c): Identify food items. Estimate weight using visible size references. Output a short English keyword and estimated weight in grams.
- For cooking scenes (type d): Note the method and set cookingMethod.
- LOCALIZATION: For EVERY item identified, provide a 2D bounding box [ymin, xmin, ymax, xmax] (0-1000 scale).

STEP 3 — MERGE & DEDUPLICATE:
If an item appears in multiple images (e.g. a label and a food photo), merge them into one item using the LABEL WEIGHT as authoritative. Do NOT duplicate.

CRITICAL RULES:
- keyword must be a short, clean English database-friendly name.
- originalName must capture raw text or local names & prep style.
- Output ONLY valid JSON matching this schema: 
{ 
  "items": [
    { 
      "keyword": "string", 
      "estimatedWeightGrams": "number", 
      "originalName": "string", 
      "source": "label | visual",
      "boundingBox2D": ["[ymin, xmin, ymax, xmax]"],
      "sourceImageIndex": "integer (0-based index of the image array)",
      "nutritionFacts": {
        "caloriesPer100g": "number (optional)",
        "proteinPer100g": "number (optional)",
        "fatPer100g": "number (optional)",
        "carbsPer100g": "number (optional)"
      }
    }
  ], 
  "cookingMethod": "string" 
}`;"""

# Replace the scoutSystemInstruction block
# Use regex to find it
pattern = r'const scoutSystemInstruction = `You are a fast visual.*?}`;'
content = re.sub(pattern, scout_replacement, content, flags=re.DOTALL)


# Also update the visionScoutCtx generation
ctx_pattern = r'const imgIdx = item\.sourceImageIndex !== undefined && item\.sourceImageIndex !== null \? item\.sourceImageIndex : "0";\s*return `- Scout Item: "\\$\{item\.keyword\}" \| Weight: \$\{item\.estimatedWeightGrams\}g \| Observed/Local Context: "\\$\{item\.originalName \|\| \'\'\}" \| Source: \$\{item\.source\} \| BoundingBox: \$\{bboxStr\} \| ImageIndex: \$\{imgIdx\}`;'

ctx_replacement = """        const imgIdx = item.sourceImageIndex !== undefined && item.sourceImageIndex !== null ? item.sourceImageIndex : "0";
        let nutStr = "";
        if (item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0) {
          nutStr = ` | NutritionFacts(per 100g): Cals ${item.nutritionFacts.caloriesPer100g}, Protein ${item.nutritionFacts.proteinPer100g}g, Fat ${item.nutritionFacts.fatPer100g}g, Carbs ${item.nutritionFacts.carbsPer100g}g`;
        }
        return `- Scout Item: "${item.keyword}" | Weight: ${item.estimatedWeightGrams}g | Observed/Local Context: "${item.originalName || ''}" | Source: ${item.source} | BoundingBox: ${bboxStr} | ImageIndex: ${imgIdx}${nutStr}`;"""

content = re.sub(ctx_pattern, ctx_replacement, content)

with open('server.ts', 'w') as f:
    f.write(content)

