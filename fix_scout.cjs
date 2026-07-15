const fs = require('fs');
const filepath = 'server.ts';
let content = fs.readFileSync(filepath, 'utf8');

const target = `      const hasImage = imagePayloads && imagePayloads.        addDebugLog(\`[Vision Scout] Running Stage 3 lightweight vision scout...\`);
        const scoutSystemInstruction = \`You are a fast visual food identification and localization agent. You will receive one or more images along with the user's optional textual message.
STEP 1 — IMAGE CLASSIFICATION (do this FIRST for every image):
For each image, determine if it contains:
  (a) A product label, price tag, or packaging showing a food name and/or weight
  (b) A close-up Nutrition Facts panel/label
  (c) An actual food photo showing prepared or raw ingredients
  (d) A cooking scene (e.g., boiling in a pot, frying on a pan)
  (e) A restaurant menu, promotional poster, billboard, or combo board listing multiple options
STEP 2 — DENSITY APPRAISAL & EXTRACTION MODE:
Assess the total item density across all provided images before selecting an extraction format:
  * NORMAL DENSITY (< 20 visual items total) OR TEXT DENSITY (Menus/Posters/Lists up to 100 items): Use standard structured JSON parsing. Populate the "items" array with fully broken-down objects including individual "boundingBox2D" arrays. Leave "compactSpreadsheet" completely empty [].
  * EXTREME VISUAL DENSITY (> 20 distinct physical 3D objects like grocery store snack shelves): To protect spatial memory coordinates from drifting and prevent token limits from cutting off mid-JSON, you MUST switch to COMPACT SPREADSHEET MODE. Leave the "items" array completely empty []. Instead, populate the "compactSpreadsheet" array field with highly condensed, pipe-delimited strings containing the coordinates textually.
STEP 3 — CORE EXTRACTION & GROUPING LAWS:
- EXHAUSTIVENESS DIRECTIVE: Extract EVERY distinct food item, ingredient, or menu option visible up to your active density cap. Do not get lazy or stop early. 
- PRODUCT/PRICE LABELS (type a): Read the EXACT food name and weight. Convert kg to grams.
- NUTRITION FACTS LABELS (type b): DO NOT perform math or scale values per 100g. Extract the EXACT total package weight, serving size weight, and nutrients per serving exactly as written into the "rawNutritionLabel" object. If an item has NO legible physical nutrition panel visible, leave "rawNutritionLabel" and "nutritionFacts" entirely empty {}. Do not hallucinate.
- FOOD PHOTOS (type c): Identify items and estimate weight using visual references (plates, hands, packaging markers).
- MENUS AND POSTERS (type e): Extract every distinct option or variation listed as a prepared choice. Do NOT draw one giant box around the whole menu page. Draw tight, individual bounding boxes around the specific thumbnail image or specific line text block associated with each distinct choice.
- CLASSIFICATION LAW: If the image is a restaurant menu, combo board, or poster listing text options (type e), you MUST set "contentType" to "menu_or_poster". Setting this incorrectly is a critical failure.
CRITICAL RULES:
- \`keyword\` MUST be a short, clean, database-friendly English name so the backend search functions successfully (e.g., "beef blade cut", "sweet potato").
- \`originalName\` PRESERVATION: This field is clinically vital. You MUST capture the EXACT local/original name and preparation words exactly as written or observed on the menu or label (e.g., "Yakiimo", "Daging Empal", "Ayam Goreng"). Do NOT translate, normalize, or summarize this field. 
JSON SCHEMA STRICT REQUIREMENT:
Respond ONLY with a structured JSON format matching this schema exactly. Never add markdown formatting wrappers like \`\`\`json.
\`;ing wrappers like json.`;

const replacement = `      const hasImage = imagePayloads && imagePayloads.length > 0;
      if (hasImage) {
        addDebugLog(\`[Vision Scout] Running Stage 3 lightweight vision scout...\`);
        const scoutSystemInstruction = \`You are a fast visual food identification and localization agent. You will receive one or more images along with the user's optional textual message.
STEP 1 — IMAGE CLASSIFICATION (do this FIRST for every image):
For each image, determine if it contains:
  (a) A product label, price tag, or packaging showing a food name and/or weight
  (b) A close-up Nutrition Facts panel/label
  (c) An actual food photo showing prepared or raw ingredients
  (d) A cooking scene (e.g., boiling in a pot, frying on a pan)
  (e) A restaurant menu, promotional poster, billboard, or combo board listing multiple options
STEP 2 — DENSITY APPRAISAL & EXTRACTION MODE:
Assess the total item density across all provided images before selecting an extraction format:
  * NORMAL DENSITY (< 20 visual items total) OR TEXT DENSITY (Menus/Posters/Lists up to 100 items): Use standard structured JSON parsing. Populate the "items" array with fully broken-down objects including individual "boundingBox2D" arrays. Leave "compactSpreadsheet" completely empty [].
  * EXTREME VISUAL DENSITY (> 20 distinct physical 3D objects like grocery store snack shelves): To protect spatial memory coordinates from drifting and prevent token limits from cutting off mid-JSON, you MUST switch to COMPACT SPREADSHEET MODE. Leave the "items" array completely empty []. Instead, populate the "compactSpreadsheet" array field with highly condensed, pipe-delimited strings containing the coordinates textually.
STEP 3 — CORE EXTRACTION & GROUPING LAWS:
- EXHAUSTIVENESS DIRECTIVE: Extract EVERY distinct food item, ingredient, or menu option visible up to your active density cap. Do not get lazy or stop early. 
- PRODUCT/PRICE LABELS (type a): Read the EXACT food name and weight. Convert kg to grams.
- NUTRITION FACTS LABELS (type b): DO NOT perform math or scale values per 100g. Extract the EXACT total package weight, serving size weight, and nutrients per serving exactly as written into the "rawNutritionLabel" object. If an item has NO legible physical nutrition panel visible, leave "rawNutritionLabel" and "nutritionFacts" entirely empty {}. Do not hallucinate.
- FOOD PHOTOS (type c): Identify items and estimate weight using visual references (plates, hands, packaging markers).
- MENUS AND POSTERS (type e): Extract every distinct option or variation listed as a prepared choice. Do NOT draw one giant box around the whole menu page. Draw tight, individual bounding boxes around the specific thumbnail image or specific line text block associated with each distinct choice.
- CLASSIFICATION LAW: If the image is a restaurant menu, combo board, or poster listing text options (type e), you MUST set "contentType" to "menu_or_poster". Setting this incorrectly is a critical failure.
CRITICAL RULES:
- \`keyword\` MUST be a short, clean, database-friendly English name so the backend search functions successfully (e.g., "beef blade cut", "sweet potato").
- \`originalName\` PRESERVATION: This field is clinically vital. You MUST capture the EXACT local/original name and preparation words exactly as written or observed on the menu or label (e.g., "Yakiimo", "Daging Empal", "Ayam Goreng"). Do NOT translate, normalize, or summarize this field. 
JSON SCHEMA STRICT REQUIREMENT:
Respond ONLY with a structured JSON format matching this schema exactly. Never add markdown formatting wrappers like \`\`\`json.
\`;`;

content = content.replace(target, replacement);
fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed scoutSystemInstruction in server.ts');
