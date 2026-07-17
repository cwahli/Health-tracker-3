const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `            if (Array.isArray(parsedScout.items)) {
              visionScoutItems = parsedScout.items.map((item: any, idx: number) => ({ ...item, scoutIndex: idx }));
              for (const item of visionScoutItems) {
                if (item.keyword) {`;

const replacement = `            if (Array.isArray(parsedScout.items)) {
              visionScoutItems = parsedScout.items.map((item: any, idx: number) => {
                let newItem = { ...item, scoutIndex: idx };
                if (newItem.rawNutritionLabel && typeof newItem.rawNutritionLabel === 'object') {
                  const getVal = (key: string) => {
                    const val = newItem.rawNutritionLabel[key];
                    if (val === undefined || val === null) return 0;
                    const match = String(val).match(/[\\d.]+/);
                    return match ? parseFloat(match[0]) : 0;
                  };
                  
                  const fat = getVal('totalFat') || getVal('fat') || 0;
                  const carbs = getVal('totalCarbohydrate') || getVal('carbohydrate') || getVal('carbohydrates') || 0;
                  const protein = getVal('protein') || 0;
                  
                  const expectedCalories = (fat * 9) + (carbs * 4) + (protein * 4);
                  const extractedCalories = getVal('calories');
                  
                  if (expectedCalories > 0 && extractedCalories > 0) {
                    const difference = Math.abs(expectedCalories - extractedCalories);
                    const percentOff = difference / expectedCalories;
                    
                    if (percentOff > 0.20) {
                      if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
                      newItem.anomalyFlags.push(\`calories mathematically auto-corrected from \${extractedCalories} to \${Math.round(expectedCalories)}\`);
                      newItem.rawNutritionLabel.calories = Math.round(expectedCalories);
                    }
                  }
                }
                return newItem;
              });
              for (const item of visionScoutItems) {
                if (item.keyword) {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('server.ts', content);
    console.log("Patched server.ts successfully!");
} else {
    console.log("Target not found in server.ts!");
}
