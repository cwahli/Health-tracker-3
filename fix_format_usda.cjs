const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      const findNutrient = (namePatterns: string[]) => {`;
const replaceStr = `      const findNutrientVal = (namePatterns: string[]) => {
        // Stricter exact word match first
        const exactMatch = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch.value + (exactMatch.unitName || "");

        // Fallback with precise keyword validation
        const nut = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) return false;
            return name.includes(cleanP);
          });
        });
        return nut ? nut.value + (nut.unitName || "") : null;
      };`;

// We need to replace the entire findNutrient function.
const oldCode = `      const findNutrient = (namePatterns: string[]) => {
        // Stricter exact word match first
        const exactMatch = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch;

        // Fallback with precise keyword validation to avoid false fatty acid matches on "fat"
        const nut = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) {
              return false; // prevent totalFat matching on saturated fat
            }
            return name.includes(cleanP);
          });
        });
        return nut;
      };

      const kcal = findNutrient(["energy", "calories"]);
      const protein = findNutrient(["protein"]);
      const fat = findNutrient(["total lipid", "fat"]);
      const satFat = findNutrient(["saturated fat", "fatty acids, total saturated"]);
      const sodium = findNutrient(["sodium"]);`;

const newCode = `      const findNutrientVal = (namePatterns: string[]) => {
        const exactMatch = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch.value + (exactMatch.unitName || "");

        const nut = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) return false;
            return name.includes(cleanP);
          });
        });
        return nut ? nut.value + (nut.unitName || "") : null;
      };

      const kcal = findNutrientVal(["energy", "calories"]);
      const protein = findNutrientVal(["protein"]);
      const fat = findNutrientVal(["total lipid", "fat"]);
      const satFat = findNutrientVal(["saturated fat", "fatty acids, total saturated"]);
      const sodium = findNutrientVal(["sodium"]);`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('server.ts', code);
