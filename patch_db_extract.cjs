const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexUSDA = /const extractUSDANutrientsPer100g = \([\s\S]*?return profile;\n    \};/;
const replacementUSDA = `const extractUSDANutrientsPer100g = (food: any): Record<string, number> => {
      const profile: Record<string, number> = {};
      // DO NOT initialize all keys to 0, so missing DB values don't overwrite LLM estimates with 0
      if (!food.foodNutrients) return profile;
      
      const findNut = (namePatterns: string[]) => {
        const exactMatch = food.foodNutrients.find((n: any) => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch;

        return food.foodNutrients.find((n: any) => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) {
              return false;
            }
            return name.includes(cleanP);
          });
        });
      };
      
      const setVal = (key: string, namePatterns: string[]) => {
        const nut = findNut(namePatterns);
        if (nut) {
          profile[key] = Number(nut.value) || 0;
        }
      };
      
      const energyNut = findNut(["energy", "calories"]);
      if (energyNut) {
        const val = Number(energyNut.value) || 0;
        const unit = (energyNut.unitName || "").toLowerCase();
        profile["calories"] = unit === "kj" ? Math.round(val / 4.184) : Math.round(val);
      }
      
      setVal("protein", ["protein"]);
      setVal("totalFat", ["total lipid", "fat"]);
      setVal("saturatedFat", ["saturated fat", "fatty acids, total saturated"]);
      setVal("transFat", ["trans fat", "fatty acids, total trans"]);
      
      if (profile["totalFat"] !== undefined) {
         profile["unsaturatedFat"] = Math.max(0, profile["totalFat"] - (profile["saturatedFat"] || 0) - (profile["transFat"] || 0));
      }
      
      setVal("omega3", ["omega-3", "omega 3", "n-3 fatty acid"]);
      setVal("carbohydrates", ["carbohydrate, by difference"]);
      setVal("addedSugar", ["added sugar"]);
      setVal("totalFibre", ["fiber, total dietary", "fibre"]);
      setVal("solubleFibre", ["fiber, soluble", "soluble fiber"]);
      setVal("sodium", ["sodium"]);
      setVal("potassium", ["potassium"]);
      setVal("magnesium", ["magnesium"]);
      setVal("calcium", ["calcium"]);
      setVal("iron", ["iron"]);
      setVal("zinc", ["zinc"]);
      setVal("selenium", ["selenium"]);
      setVal("iodine", ["iodine"]);
      setVal("phosphorus", ["phosphorus"]);
      setVal("vitaminD", ["vitamin d"]);
      setVal("vitaminB12", ["vitamin b-12", "vitamin b12"]);
      setVal("folate", ["folate"]);
      setVal("vitaminC", ["vitamin c", "ascorbic acid"]);
      setVal("vitaminE", ["vitamin e", "tocopherol"]);
      setVal("vitaminK", ["vitamin k"]);
      setVal("vitaminA", ["vitamin a"]);
      setVal("vitaminB6", ["vitamin b-6", "vitamin b6"]);
      setVal("thiamine", ["thiamine"]);
      setVal("riboflavin", ["riboflavin"]);
      setVal("niacin", ["niacin"]);
      
      return profile;
    };`;

code = code.replace(regexUSDA, replacementUSDA);

const regexOFF = /const extractOFFNutrientsPer100g = \([\s\S]*?return profile;\n    \};/;
const replacementOFF = `const extractOFFNutrientsPer100g = (product: any): Record<string, number> => {
      const profile: Record<string, number> = {};
      const n = product.nutriments;
      if (!n) return profile;
      
      if (n["energy-kcal_100g"] !== undefined) {
        profile["calories"] = Number(n["energy-kcal_100g"]) || 0;
      } else if (n["energy_100g"] !== undefined) {
        profile["calories"] = Math.round(Number(n["energy_100g"]) / 4.184) || 0;
      }
      
      const setNum = (key: string, field: string, scale: number = 1) => {
        if (n[field] !== undefined) {
          profile[key] = (Number(n[field]) || 0) * scale;
        }
      };

      setNum("protein", "proteins_100g");
      setNum("totalFat", "fat_100g");
      setNum("saturatedFat", "saturated-fat_100g");
      setNum("transFat", "trans-fat_100g");
      
      if (profile["totalFat"] !== undefined) {
        profile["unsaturatedFat"] = Math.max(0, profile["totalFat"] - (profile["saturatedFat"] || 0) - (profile["transFat"] || 0));
      }
      
      setNum("omega3", "omega-3_100g");
      setNum("carbohydrates", "carbohydrates_100g");
      setNum("addedSugar", "sugars_100g");
      setNum("totalFibre", "fiber_100g");
      setNum("solubleFibre", "soluble-fiber_100g");
      
      setNum("sodium", "sodium_100g", 1000);
      setNum("potassium", "potassium_100g", 1000);
      setNum("magnesium", "magnesium_100g", 1000);
      setNum("calcium", "calcium_100g", 1000);
      setNum("iron", "iron_100g", 1000);
      setNum("zinc", "zinc_100g", 1000);
      setNum("selenium", "selenium_100g");
      setNum("iodine", "iodine_100g");
      setNum("phosphorus", "phosphorus_100g", 1000);
      setNum("vitaminD", "vitamin-d_100g");
      setNum("vitaminB12", "vitamin-b12_100g");
      setNum("folate", "folate_100g");
      setNum("vitaminC", "vitamin-c_100g", 1000);
      setNum("vitaminE", "vitamin-e_100g", 1000);
      setNum("vitaminK", "vitamin-k_100g");
      setNum("vitaminA", "vitamin-a_100g");
      setNum("vitaminB6", "vitamin-b6_100g", 1000);
      setNum("thiamine", "thiamine_100g", 1000);
      setNum("riboflavin", "riboflavin_100g", 1000);
      setNum("niacin", "niacin_100g", 1000);

      return profile;
    };`;

code = code.replace(regexOFF, replacementOFF);

fs.writeFileSync('server.ts', code);
