// Pure, side-effect-free helpers extracted from server.ts so they can be unit
// tested without importing server.ts (which starts a live HTTP server and
// initializes Firebase Admin as soon as the module loads).
// Do not add imports here that create side effects (firebase, fs, express).
// Extracted verbatim on 2026-07-20 — do not change behavior.

// Simple and robust custom JS object-to-YAML stringifier
export function jsToYaml(val: any, indent: number = 0): string {
  const spaces = " ".repeat(indent);
  if (val === null) return "null";
  if (val === undefined) return "null";
  if (typeof val === "string") {
    if (val.includes("\n")) {
      return "|\n" + val.split("\n").map(line => spaces + "  " + line).join("\n");
    }
    if (val.includes(":") || val.includes("#") || val.startsWith("-")) {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    let out = "";
    for (const item of val) {
      if (typeof item === "object" && item !== null) {
        const inner = jsToYaml(item, indent + 2);
        const lines = inner.split("\n");
        out += `\n${spaces}- ${lines[0].trim()}`;
        if (lines.length > 1) {
          out += "\n" + lines.slice(1).join("\n");
        }
      } else {
        out += `\n${spaces}- ${jsToYaml(item, indent + 2)}`;
      }
    }
    return out;
  }
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    let out = "";
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = val[k];
      const prefix = i === 0 && indent > 0 ? "" : spaces;
      if (typeof v === "object" && v !== null) {
        out += `${prefix}${k}:${Array.isArray(v) ? "" : "\n"}${jsToYaml(v, indent + (Array.isArray(v) ? 0 : 2))}\n`;
      } else {
        out += `${prefix}${k}: ${jsToYaml(v, indent + 2)}\n`;
      }
    }
    return out.trim();
  }
  return String(val);
}

export function extractBalancedJson(text: string): string {
  let cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const startIdx = cleaned.indexOf("{");
  if (startIdx !== -1) {
    let depth = 0;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") depth--;
      if (depth === 0) {
        return cleaned.substring(startIdx, i + 1);
      }
    }
  }
  return cleaned;
}

// Defensive numeric guard for weight values coming from LLM output.
// Number(x) alone is not safe here: an overlong digit string overflows to
// Infinity, and "Infinity || fallback" still evaluates to Infinity because
// Infinity is truthy. This rejects non-finite and unreasonably large values.
export function sanitizeMealWeight(value: any, fallback: number, maxGrams: number = 10000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > maxGrams) return fallback;
  return Math.round(n);
}

export function sanitizeString(val: any, fallback: string): string {
  if (val === null || val === undefined || String(val).toLowerCase() === "undefined" || String(val).trim() === "") {
    return fallback;
  }
  return String(val);
}

export function findItemIndexInList(itemsBreakdown: any[], itemNameStr: string, targetDbId: string | null): number {
  if (!itemsBreakdown || !Array.isArray(itemsBreakdown)) return -1;
  const nameLower = itemNameStr.trim().toLowerCase();
  // Sanitize targetDbId: strip all non-printable/non-ASCII characters (e.g. emoji variation selectors)
  const cleanDbId = targetDbId ? String(targetDbId).replace(/[^\x20-\x7E]/g, '').trim() : null;
  if (!nameLower && !cleanDbId) return -1;

  // 1. Exact match by dbId
  if (cleanDbId) {
    const idx = itemsBreakdown.findIndex((it: any) => it.dbId && String(it.dbId) === cleanDbId);
    if (idx !== -1) return idx;
  }

  // 2. Exact match by item name (case-insensitive)
  const exactIdx = itemsBreakdown.findIndex((it: any) => it.name && it.name.trim().toLowerCase() === nameLower);
  if (exactIdx !== -1) return exactIdx;

  // 3. Exact match by canonical name if present
  const canonicalIdx = itemsBreakdown.findIndex((it: any) => it.canonicalDbName && it.canonicalDbName.trim().toLowerCase() === nameLower);
  if (canonicalIdx !== -1) return canonicalIdx;

  // 4. Substring prefix/suffix match (e.g. startsWith or endsWith)
  const wordMatchIdx = itemsBreakdown.findIndex((it: any) => {
    const itName = (it.name || "").trim().toLowerCase();
    return itName.startsWith(nameLower) || itName.endsWith(nameLower);
  });
  if (wordMatchIdx !== -1) return wordMatchIdx;

  // 5. Classic includes fallback (fuzzy substring, first match wins)
  const includesIdx = itemsBreakdown.findIndex((it: any) => {
    const itName = (it.name || "").trim().toLowerCase();
    return itName.includes(nameLower) || nameLower.includes(itName);
  });
  if (includesIdx !== -1) return includesIdx;

  // 6. Word-by-word intersection match as ultimate fallback
  const words = nameLower.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const wordMatch = itemsBreakdown.findIndex((it: any) => {
      const itName = (it.name || "").trim().toLowerCase();
      const itCanon = (it.canonicalDbName || "").trim().toLowerCase();
      return words.some(word => itName.includes(word) || itCanon.includes(word));
    });
    if (wordMatch !== -1) return wordMatch;
  }

  return -1;
}

export function extractUSDANutrientsPer100g(food: any): Record<string, number> {
  const profile: Record<string, number> = {};
  if (!food || !food.foodNutrients) return profile;
  
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
}

export function extractOFFNutrientsPer100g(product: any): Record<string, number> {
  const profile: Record<string, number> = {};
  if (!product || !product.nutriments) return profile;
  const n = product.nutriments;
  
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
}
