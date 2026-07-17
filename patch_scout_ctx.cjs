const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `        let rawLabelStr = item.rawNutritionLabel && Object.keys(item.rawNutritionLabel).length > 0 ? \` | RawNutritionLabel: \${JSON.stringify(item.rawNutritionLabel)}\` : "";
        let factsStr = item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0 ? \` | NutritionFacts: \${JSON.stringify(item.nutritionFacts)}\` : "";
        return \`- Index: \${idx} | Scout Item: "\${item.keyword}" | Weight: \${item.estimatedWeightGrams}g | Observed/Local Context: "\${item.originalName}" | Source: \${item.source} | BoundingBox: \${JSON.stringify(item.boundingBox2D)} | ImageIndex: \${item.sourceImageIndex}\${rawLabelStr}\${factsStr}\${flagStr}\${confStr}\`;`;

const replacement = `        let scaledNutrientsStr = "";
        const raw = item.rawNutritionLabel;
        const facts = item.nutritionFacts;
        
        if (raw && Object.keys(raw).length > 0) {
           let multiplier = 1;
           const estimatedWeight = item.estimatedWeightGrams || 100;
           if (raw.servingSize) {
              const ssMatch = String(raw.servingSize).match(/[\\d.]+/);
              if (ssMatch) {
                 multiplier = estimatedWeight / parseFloat(ssMatch[0]);
              } else {
                 multiplier = estimatedWeight / 100;
              }
           } else {
              multiplier = estimatedWeight / 100;
           }
           
           const scaledRaw: any = {};
           for (const [k, v] of Object.entries(raw)) {
              if (k.toLowerCase().includes('serving')) {
                 scaledRaw[k] = v;
              } else {
                 const match = String(v).match(/[\\d.]+/);
                 if (match) {
                    const num = parseFloat(match[0]);
                    const unit = String(v).replace(/[\\d.\\s]/g, '');
                    scaledRaw[k] = \`\${Math.round(num * multiplier)}\${unit}\`;
                 } else {
                    scaledRaw[k] = v;
                 }
              }
           }
           scaledNutrientsStr = \` | TRUE TOTAL NUTRITIONAL PAYLOAD FOR ENTIRE WEIGHT (\${estimatedWeight}g): \${JSON.stringify(scaledRaw)} (CRITICAL: USE THESE TOTALS DIRECTLY for averageNutrients, pros, and cons. Do not do any more math!)\`;
        } else if (facts && Object.keys(facts).length > 0) {
           scaledNutrientsStr = \` | NutritionFacts: \${JSON.stringify(facts)}\`;
        }
        
        return \`- Index: \${idx} | Scout Item: "\${item.keyword}" | Weight: \${item.estimatedWeightGrams}g | Observed/Local Context: "\${item.originalName}" | Source: \${item.source} | BoundingBox: \${JSON.stringify(item.boundingBox2D)} | ImageIndex: \${item.sourceImageIndex}\${scaledNutrientsStr}\${flagStr}\${confStr}\`;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.ts', content);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
