const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Normalize line endings to \n just in case
content = content.replace(/\r\n/g, '\n');

// 1. Instruction Replacement
const oldInstruction = `MODE F: FOOD ORIGIN LOOKUP
  Triggered ONLY when the user's query asks for details, origin, history, description, or ingredients of specific food items (e.g., "Look up details and food origin for: ...", "Origin search and ingredients for: ...").
  - Do NOT expect an active meal image or try to log a meal.
  - Instead, act as an educational encyclopedia agent. Describe the historical origins, traditional preparation, key ingredients, and clinical health profile of the food items.
  - Set "mode": "origin". Populate the "origins" array. Set foodData and comparison to null.`;

const newInstruction = `MODE F: FOOD ORIGIN LOOKUP
  Triggered ONLY when the user's query asks for details, origin, history, description, ingredients, or "Origin search" of specific food items (e.g., "Look up details and food origin for: ...", "Origin search: ...").
  - Do NOT expect an active meal image or try to log a meal.
  - Instead, act as an educational, experiential culinary encyclopedia.
  - For each selected food item in the "origins" array, you MUST provide:
    * "origin": Historical origin country/region, cultural history, and traditional context.
    * "howItIsCooked": Describe how this food is traditionally prepared, seasoned, and cooked.
    * "whenItIsEaten": Describe the traditional occasions, festivals, meals (breakfast, street food), or cultural timing when this dish is typically consumed.
    * "healthImpact": Analyze the clinical impact of this food relative to the patient's biomarkers and target top nutrients (e.g. Saturated Fat, Sodium, Calories), and give concrete dietary recommendations.
    * "imageQueries": An array of 1 to 3 search queries to find real, vivid pictures of the food, ingredients, or prep (e.g. ["Tongkol Bakar grilled fish on plate", "Tongkol Bakar traditional preparation"]).
  - Set "mode": "origin". Populate the "origins" array. Set foodData and comparison to null.`;

if (content.includes(oldInstruction)) {
  content = content.replace(oldInstruction, newInstruction);
  console.log("Replaced instruction.");
} else {
  console.log("Could not find instruction block.");
}

// 2. Schema replacement
const oldSchema = `        origins: {
          type: Type.ARRAY,
          nullable: true,
          description: "For origin mode only: list of detailed historical food origin lookup results.",
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              origin: { type: Type.STRING, description: "Historical origin country/region and traditional context" },
              description: { type: Type.STRING, description: "Traditional preparation methods and description" },
              keyIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              healthProfile: { type: Type.STRING, description: "Clinical analysis and nutritional profile relative to user's biomarkers" },
              imageSearchQuery: { type: Type.STRING, description: "A Google search query to fetch a real photo of the food" }
            },
            required: ["foodName", "origin", "description", "keyIngredients", "healthProfile", "imageSearchQuery"]
          }
        }`;

const newSchema = `        origins: {
          type: Type.ARRAY,
          nullable: true,
          description: "For origin mode only: list of detailed historical food origin lookup results.",
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              origin: { type: Type.STRING, description: "Historical origin country/region and traditional context" },
              howItIsCooked: { type: Type.STRING, description: "How it is traditionally cooked and prepared" },
              whenItIsEaten: { type: Type.STRING, description: "Typical occasions or meals when it is eaten" },
              healthImpact: { type: Type.STRING, description: "Clinical analysis and target biomarker recommendations" },
              imageQueries: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 1-3 Google search queries to find pictures of this food"
              }
            },
            required: ["foodName", "origin", "howItIsCooked", "whenItIsEaten", "healthImpact", "imageQueries"]
          }
        }`;

if (content.includes(oldSchema)) {
  content = content.replace(oldSchema, newSchema);
  console.log("Replaced schema.");
} else {
  console.log("Could not find schema block.");
}

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Done');
