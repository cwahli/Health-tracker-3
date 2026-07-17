const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `                  const expectedCalories = (fat * 9) + (carbs * 4) + (protein * 4);
                  const extractedCalories = getVal('calories');
                  
                  if (expectedCalories > 0 && extractedCalories > 0) {
                    const difference = Math.abs(expectedCalories - extractedCalories);
                    const percentOff = difference / expectedCalories;
                    
                    if (percentOff > 0.20) {
                      if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
                      newItem.anomalyFlags.push(\`calories mathematically auto-corrected from \${extractedCalories} to \${Math.round(expectedCalories)}\`);
                      newItem.rawNutritionLabel.calories = Math.round(expectedCalories);
                    }
                  }`;

const replacement = `                  // 1. Fat Overflow (Saturated Fat > Total Fat)
                  const satFat = getVal('saturatedFat') || 0;
                  let correctedFat = fat;
                  if (satFat > fat) {
                    correctedFat = satFat;
                    if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
                    newItem.anomalyFlags.push(\`fat overflow corrected: totalFat increased from \${fat} to \${satFat}\`);
                    if (newItem.rawNutritionLabel.totalFat !== undefined) newItem.rawNutritionLabel.totalFat = satFat;
                    else newItem.rawNutritionLabel.fat = satFat;
                  }
                  
                  // 2. Serving Mismatch / Macros Overflow
                  let servingSizeGrams = 100; // default for per 100g
                  if (newItem.rawNutritionLabel.servingSize) {
                    const ssMatch = String(newItem.rawNutritionLabel.servingSize).match(/[\\d.]+/);
                    if (ssMatch) servingSizeGrams = parseFloat(ssMatch[0]);
                  }
                  const totalMacros = correctedFat + carbs + protein;
                  if (totalMacros > servingSizeGrams + 2) {
                    if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
                    newItem.anomalyFlags.push(\`macros overflow: sum of fat, carbs, protein (\${totalMacros}g) exceeds serving size (\${servingSizeGrams}g)\`);
                  }

                  // 3. Calories auto-correction
                  const expectedCalories = (correctedFat * 9) + (carbs * 4) + (protein * 4);
                  const extractedCalories = getVal('calories');
                  
                  if (expectedCalories > 0 && extractedCalories > 0) {
                    const difference = Math.abs(expectedCalories - extractedCalories);
                    const percentOff = difference / expectedCalories;
                    
                    if (percentOff > 0.20) {
                      if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
                      newItem.anomalyFlags.push(\`calories mathematically auto-corrected from \${extractedCalories} to \${Math.round(expectedCalories)}\`);
                      newItem.rawNutritionLabel.calories = Math.round(expectedCalories);
                    }
                  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.ts', content);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
