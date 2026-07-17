const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/NutritionLabelTable.tsx', 'utf8');

const target = `    let autoCorrectedCalories = false;
    let originalCalories = null;
    let correctedRaw = { ...parsedRaw };
    
    // Check if anomalyFlags indicate calorie correction
    if (item.anomalyFlags && Array.isArray(item.anomalyFlags)) {
      const calorieFlag = item.anomalyFlags.find((f: string) => f.includes("calories mathematically auto-corrected from"));
      if (calorieFlag) {
        autoCorrectedCalories = true;
        const match = calorieFlag.match(/from (\\d+(?:\\.\\d+)?) to/);
        if (match) {
          originalCalories = match[1];
        }
      }
    }`;

const replacement = `    let autoCorrectedCalories = item.autoCorrectedCalories || false;
    let originalCalories = item.originalCalories || null;
    let correctedRaw = { ...parsedRaw };
    
    // Check if anomalyFlags indicate calorie correction
    if (item.anomalyFlags && Array.isArray(item.anomalyFlags)) {
      const calorieFlag = item.anomalyFlags.find((f: string) => f.includes("calories mathematically auto-corrected from"));
      if (calorieFlag) {
        autoCorrectedCalories = true;
        const match = calorieFlag.match(/from (\\d+(?:\\.\\d+)?) to/);
        if (match) {
          originalCalories = match[1];
        }
      }
    }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', content);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
