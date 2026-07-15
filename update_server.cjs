const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Replace scoutSystemInstruction
const newScoutInstruction = \`        const scoutSystemInstruction = \`You are a fast visual food identification and localization agent. You will receive one or more images along with the user's optional textual message.
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
\`;\`;

// Match the scoutSystemInstruction definition block (from 1741 to the closing backtick of the template literal)
content = content.replace(/const scoutSystemInstruction = \`[\\s\\S]*?JSON SCHEMA STRICT REQUIREMENT:[\\s\\S]*?\`/, newScoutInstruction);

// 2. Replace shouldRunDbSearch
content = content.replace(
  'const shouldRunDbSearch = !isWeightModification && !isMenuScale && !isEvaluationScale && (visionScoutRanAndReturnedItems || (!hasImage && queriesToSearch.length > 0));',
  'const isEvaluationScale = queriesToSearch.length >= 10;\\n    const shouldRunDbSearch = !isWeightModification && !isMenuScale && !isEvaluationScale && (visionScoutRanAndReturnedItems || (!hasImage && queriesToSearch.length > 0));'
);

// 3. Replace endpoint
const oldEndpoint = /app\.post\("\/api\/gemini\/food-image-search", async \(req, res\) => \{[\\s\\S]*?\}\);/;
const newEndpoint = \`app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}"\`);
  
  try {
    const apiKey = process.env.Custom_Search_API || "AIzaSyDGpOvUtgu7fEbpgms1ICuvFvJxi8DMGvA";
    const cx = process.env.Custom_Search_CX || "40e028bbf9ec84932";
    
    if (!apiKey || apiKey === "AIzaSyDGpOvUtgu7fEbpgms1ICuvFvJxi8DMGvA") {
      return res.json({
        images: [],
        isAvailable: false,
        error: "Google Custom Search API Key is not configured on Cloud Run. Please select the correct GCP project (Food search) and create a credentials key."
      });
    }
    const url = \`https://www.googleapis.com/customsearch/v1?key=\${apiKey}&cx=\${cx}&q=\${encodeURIComponent(query)}&searchType=image&num=2\`;
    const cseRes = await fetch(url);
    const data = await cseRes.json();
    
    if (cseRes.ok && data.items && data.items.length >= 2) {
      addDebugLog(\`[FoodImageSearch] Successfully found images via Google CSE!\`);
      const results = data.items.slice(0, 2).map((item: any) => ({
        title: item.title,
        imageUrl: item.link,
        pageUrl: item.image?.contextLink || \`https://www.google.com/search?q=\${encodeURIComponent(query)}\`
      }));
      return res.json({ images: results, isAvailable: true });
    } else {
      const errMsg = data.error?.message || "No items returned from search.";
      addDebugLog(\`[FoodImageSearch] Google CSE failed. Status: \${cseRes.status}. Message: \${errMsg}\`);
      return res.json({
        images: [],
        isAvailable: false,
        error: \`Google CSE Error (\${cseRes.status}): \${errMsg}\`
      });
    }
  } catch (error: any) {
    console.error("[FoodImageSearch Error]:", error);
    return res.json({
      images: [],
      isAvailable: false,
      error: \`Network Error: \${error.message || "Failed to contact Google Search API."}\`
    });
  }
});\`;

content = content.replace(oldEndpoint, newEndpoint);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Replacements complete');
