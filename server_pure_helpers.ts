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

export function getUSDANutrientValue(n: any): number {
  if (!n) return 0;
  if (typeof n === 'number') return isNaN(n) ? 0 : n;
  if (typeof n.value === 'number') return isNaN(n.value) ? 0 : n.value;
  if (typeof n.amount === 'number') return isNaN(n.amount) ? 0 : n.amount;
  if (n.value && typeof n.value === 'number') return n.value;
  if (n.value && typeof n.value === 'object' && typeof n.value.amount === 'number') return n.value.amount;
  if (n.amount && typeof n.amount === 'object' && typeof n.amount.value === 'number') return n.amount.value;
  const raw = n.value !== undefined ? n.value : n.amount;
  if (raw !== undefined && raw !== null) {
    const parsed = parseFloat(String(raw));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

const SATFAT_RATIO_BY_TYPE: Record<string, number> = {
  red_meat: 0.40,
  poultry: 0.30,
  dairy: 0.60,
  fish_fatty: 0.25,
  fish_lean: 0.20,
  grain: 0.20,
  legume: 0.15,
  leafy_veg: 0.10,
  root_veg: 0.10,
  ultra_processed: 0.35,
  other: 0.20
};

export function getSaturatedFatRatio(description: string): number {
  const d = String(description || "").toLowerCase();
  if (d.includes("steak") || d.includes("beef") || d.includes("lamb") || d.includes("pork") || d.includes("mutton") || d.includes("veal") || d.includes("daging")) return SATFAT_RATIO_BY_TYPE.red_meat;
  if (d.includes("chicken") || d.includes("turkey") || d.includes("duck") || d.includes("poultry") || d.includes("ayam")) return SATFAT_RATIO_BY_TYPE.poultry;
  if (d.includes("salmon") || d.includes("tuna") || d.includes("mackerel") || d.includes("sardine") || d.includes("herring") || d.includes("fatty fish")) return SATFAT_RATIO_BY_TYPE.fish_fatty;
  if (d.includes("cod") || d.includes("halibut") || d.includes("snapper") || d.includes("bass") || d.includes("tilapia") || d.includes("fish") || d.includes("ikan")) return SATFAT_RATIO_BY_TYPE.fish_lean;
  if (d.includes("milk") || d.includes("cheese") || d.includes("butter") || d.includes("yogurt") || d.includes("dairy")) return SATFAT_RATIO_BY_TYPE.dairy;
  if (d.includes("rice") || d.includes("bread") || d.includes("oat") || d.includes("wheat") || d.includes("grain") || d.includes("corn") || d.includes("maize") || d.includes("pasta") || d.includes("noodle")) return SATFAT_RATIO_BY_TYPE.grain;
  if (d.includes("bean") || d.includes("lentil") || d.includes("pea") || d.includes("chickpea") || d.includes("legume") || d.includes("tempeh") || d.includes("tofu")) return SATFAT_RATIO_BY_TYPE.legume;
  if (d.includes("potato") || d.includes("carrot") || d.includes("onion") || d.includes("garlic") || d.includes("beet") || d.includes("radish") || d.includes("yam") || d.includes("tuber") || d.includes("root") || d.includes("kentang") || d.includes("wortel")) return SATFAT_RATIO_BY_TYPE.root_veg;
  if (d.includes("spinach") || d.includes("kale") || d.includes("lettuce") || d.includes("cabbage") || d.includes("leaf") || d.includes("leaves") || d.includes("sayur") || d.includes("kangkung") || d.includes("pakchoy") || d.includes("mustard green") || d.includes("broccoli") || d.includes("cauliflower")) return SATFAT_RATIO_BY_TYPE.leafy_veg;
  if (d.includes("donut") || d.includes("candy") || d.includes("chocolate") || d.includes("chip") || d.includes("french fry") || d.includes("french fries") || d.includes("processed") || d.includes("nugget")) return SATFAT_RATIO_BY_TYPE.ultra_processed;
  return SATFAT_RATIO_BY_TYPE.other;
}

export function extractUSDANutrientsPer100g(food: any): Record<string, number> {
  const profile: Record<string, number> = {};
  if (!food || !food.foodNutrients) return profile;
  
  const findNut = (namePatterns: string[]) => {
    const exactMatch = food.foodNutrients.find((n: any) => {
      const name = (n.nutrientName || (n.nutrient && n.nutrient.name) || "").toLowerCase().trim();
      return namePatterns.some(p => name === p.toLowerCase().trim());
    });
    if (exactMatch) return exactMatch;

    return food.foodNutrients.find((n: any) => {
      const name = (n.nutrientName || (n.nutrient && n.nutrient.name) || "").toLowerCase();
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
      profile[key] = getUSDANutrientValue(nut);
    }
  };
  
  // Find energy/calories. We prefer Kilocalories (ID 1008) over Kilojoules (ID 1062).
  let kcalNut = food.foodNutrients.find((n: any) => {
    const id = Number(n.nutrientId || (n.nutrient && n.nutrient.id));
    const num = String(n.nutrientNumber || "");
    const name = (n.nutrientName || (n.nutrient && n.nutrient.name) || "").toLowerCase();
    const unit = (n.unitName || (n.nutrient && n.nutrient.unitName) || "").toLowerCase();
    return id === 1008 || num === "208" || name.includes("kcal") || name.includes("kilocalories") || (name === "energy" && unit === "kcal");
  });

  let kjNut = food.foodNutrients.find((n: any) => {
    const id = Number(n.nutrientId || (n.nutrient && n.nutrient.id));
    const num = String(n.nutrientNumber || "");
    const name = (n.nutrientName || (n.nutrient && n.nutrient.name) || "").toLowerCase();
    const unit = (n.unitName || (n.nutrient && n.nutrient.unitName) || "").toLowerCase();
    return id === 1062 || num === "268" || name.includes("kj") || name.includes("kilojoules") || (name === "energy" && unit === "kj");
  });

  if (kcalNut) {
    const val = getUSDANutrientValue(kcalNut);
    profile["calories"] = Math.round(val);
  } else if (kjNut) {
    const val = getUSDANutrientValue(kjNut);
    profile["calories"] = Math.round(val / 4.184);
  } else {
    // Fallback to standard name matching
    const energyNut = findNut(["energy", "calories"]);
    if (energyNut) {
      const val = getUSDANutrientValue(energyNut);
      const unit = (energyNut.unitName || (energyNut.nutrient && energyNut.nutrient.unitName) || "").toLowerCase();
      const name = (energyNut.nutrientName || (energyNut.nutrient && energyNut.nutrient.name) || "").toLowerCase();
      if (unit === "kj" || name.includes("kilojoules") || name.includes("kj")) {
        profile["calories"] = Math.round(val / 4.184);
      } else {
        profile["calories"] = Math.round(val);
      }
    }
  }
  
  setVal("protein", ["protein"]);
  setVal("totalFat", ["total lipid", "fat"]);
  setVal("saturatedFat", ["saturated fat", "fatty acids, total saturated"]);
  setVal("transFat", ["trans fat", "fatty acids, total trans"]);

  // Deterministic Saturated Fat Fallback (Bug 4)
  if (profile["saturatedFat"] === undefined || profile["saturatedFat"] === null || isNaN(profile["saturatedFat"])) {
    const totalFat = profile["totalFat"] || 0;
    if (totalFat > 0) {
      const desc = food.description || food.name || "";
      const ratio = getSaturatedFatRatio(desc);
      profile["saturatedFat"] = parseFloat((totalFat * ratio).toFixed(2));
    } else {
      profile["saturatedFat"] = 0;
    }
  }
  
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

  // Deterministic Saturated Fat Fallback (Bug 4)
  if (profile["saturatedFat"] === undefined || profile["saturatedFat"] === null || isNaN(profile["saturatedFat"])) {
    const totalFat = profile["totalFat"] || 0;
    if (totalFat > 0) {
      const desc = product.product_name || "";
      const ratio = getSaturatedFatRatio(desc);
      profile["saturatedFat"] = parseFloat((totalFat * ratio).toFixed(2));
    } else {
      profile["saturatedFat"] = 0;
    }
  }
  
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
