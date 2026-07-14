const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update Mode D instructions
const oldModeD = /MODE D: EVALUATION \/ COMPARISON[\s\S]*?- Output specific foods/;
const newModeD = `MODE D: EVALUATION / COMPARISON
Triggered ONLY when explicitly evaluating alternative foods (e.g. comparing two snacks), OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster".
- CRITICAL: Do NOT use this mode for a standard meal photo or when the user says they ate something.
- EXHAUSTIVE DIRECTIVE: Group all identified food items into relevant buckets (groups) based on similar top nutrients (e.g., "Low Saturated Fat Options", "High Protein", "High Risk Items"). 
- Instead of showing weight, calorie, sat fat for each item individually, show them as an aggregate (average) for the group. 
- Output the specific groups in comparison.groups. Rank the groups best-to-worst.
- For each group, provide groupName, suitability, pros, cons, averageNutrients, and an items array containing just the name, targetDbId, boundingBox2D, and sourceImageIndex of each food in the group. OMIT the comparisonTable entirely.`;
code = code.replace(oldModeD, newModeD);

// Update schema
const oldComparison = /comparison: \{\s*type: Type\.OBJECT,\s*properties: \{\s*keyNutrientConcern: \{ type: Type\.STRING, description: "[^"]*" \},\s*comparisonTitle: \{ type: Type\.STRING, nullable: true \},\s*foods: \{[\s\S]*?\},(?=\s*comparisonTable:)/;
const newComparison = `comparison: {
          type: Type.OBJECT,
          properties: {
            keyNutrientConcern: { type: Type.STRING, description: "Comma-separated list of 2-3 most critical nutrients to monitor for this patient (e.g., 'Sodium, Saturated Fat, Calories')" },
            comparisonTitle: { type: Type.STRING, nullable: true },
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  groupName: { type: Type.STRING },
                  suitability: { type: Type.STRING },
                  pros: { type: Type.STRING },
                  cons: { type: Type.STRING },
                  averageNutrients: {
                    type: Type.OBJECT, nullable: true, required: ["calories"],
                    properties: { calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER, nullable: true }, totalFat: { type: Type.NUMBER, nullable: true }, saturatedFat: { type: Type.NUMBER, nullable: true }, sodium: { type: Type.NUMBER, nullable: true }, carbohydrates: { type: Type.NUMBER, nullable: true }, addedSugar: { type: Type.NUMBER, nullable: true }, potassium: { type: Type.NUMBER, nullable: true }, totalFibre: { type: Type.NUMBER, nullable: true } }
                  },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        targetDbId: { type: Type.STRING, nullable: true },
                        boundingBox2D: {
                          type: Type.ARRAY,
                          items: { type: Type.INTEGER },
                          nullable: true
                        },
                        sourceImageIndex: {
                          type: Type.INTEGER,
                          nullable: true
                        }
                      },
                      required: ["name"]
                    }
                  }
                },
                required: ["groupName", "suitability", "pros", "cons", "items"]
              }
            },`;

code = code.replace(oldComparison, newComparison);

fs.writeFileSync('server.ts', code);
console.log('server.ts schema and prompt patched');
