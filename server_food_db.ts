// Food-type classification table for the 20 trace nutrients.
// Keyed by the 14 foodType values the LLM outputs. All values are per 100g.
// This table is STABLE — adding new foods does not require updating it.
export type FoodType =
  | 'red_meat' | 'poultry' | 'fish_fatty' | 'fish_lean' | 'shellfish'
  | 'egg' | 'dairy' | 'leafy_veg' | 'root_veg' | 'legume'
  | 'grain' | 'fruit' | 'processed' | 'unknown';
export interface TraceNutrients {
  unsaturatedFat: number; omega3: number;
  magnesium: number; calcium: number; iron: number; zinc: number;
  selenium: number; iodine: number; phosphorus: number;
  vitaminD: number; vitaminB12: number; folate: number;
  vitaminC: number; vitaminE: number; vitaminK: number;
  vitaminA: number; vitaminB6: number; thiamine: number;
  riboflavin: number; niacin: number;
}
export const FOOD_TYPE_TRACE_NUTRIENTS: Record<FoodType, TraceNutrients> = {
  red_meat:   { unsaturatedFat:6.0, omega3:0.10, magnesium:22, calcium:15, iron:2.5, zinc:4.5, selenium:22, iodine:2.5, phosphorus:195, vitaminD:3,   vitaminB12:2.5, folate:8,   vitaminC:0,  vitaminE:0.2, vitaminK:1.5, vitaminA:0,    vitaminB6:0.40, thiamine:0.07, riboflavin:0.17, niacin:5.5 },
  poultry:    { unsaturatedFat:4.5, omega3:0.06, magnesium:28, calcium:12, iron:0.9, zinc:1.8, selenium:18, iodine:8,   phosphorus:210, vitaminD:5,   vitaminB12:0.3, folate:6,   vitaminC:0,  vitaminE:0.3, vitaminK:3.0, vitaminA:40,   vitaminB6:0.60, thiamine:0.06, riboflavin:0.12, niacin:13.0 },
  fish_fatty: { unsaturatedFat:9.0, omega3:2.50, magnesium:27, calcium:10, iron:0.4, zinc:0.5, selenium:32, iodine:15,  phosphorus:245, vitaminD:525, vitaminB12:3.2, folate:5,   vitaminC:0,  vitaminE:1.1, vitaminK:0.5, vitaminA:50,   vitaminB6:0.60, thiamine:0.20, riboflavin:0.15, niacin:8.5 },
  fish_lean:  { unsaturatedFat:1.5, omega3:0.40, magnesium:30, calcium:18, iron:0.5, zinc:0.6, selenium:38, iodine:12,  phosphorus:220, vitaminD:80,  vitaminB12:1.8, folate:7,   vitaminC:0,  vitaminE:0.6, vitaminK:0.1, vitaminA:18,   vitaminB6:0.40, thiamine:0.10, riboflavin:0.10, niacin:7.0 },
  shellfish:  { unsaturatedFat:0.8, omega3:0.60, magnesium:34, calcium:80, iron:3.0, zinc:5.5, selenium:45, iodine:35,  phosphorus:210, vitaminD:10,  vitaminB12:10.0, folate:12, vitaminC:3,  vitaminE:0.9, vitaminK:0.1, vitaminA:50,   vitaminB6:0.10, thiamine:0.09, riboflavin:0.17, niacin:2.5 },
  egg:        { unsaturatedFat:4.5, omega3:0.10, magnesium:12, calcium:50, iron:1.8, zinc:1.3, selenium:31, iodine:50,  phosphorus:198, vitaminD:82,  vitaminB12:1.1, folate:47,  vitaminC:0,  vitaminE:1.0, vitaminK:0.3, vitaminA:140,  vitaminB6:0.17, thiamine:0.04, riboflavin:0.46, niacin:0.1 },
  dairy:      { unsaturatedFat:1.5, omega3:0.05, magnesium:11, calcium:120,iron:0.1, zinc:0.4, selenium:3,  iodine:15,  phosphorus:93,  vitaminD:40,  vitaminB12:0.4, folate:5,   vitaminC:0,  vitaminE:0.1, vitaminK:0.3, vitaminA:50,   vitaminB6:0.04, thiamine:0.04, riboflavin:0.18, niacin:0.1 },
  leafy_veg:  { unsaturatedFat:0.1, omega3:0.05, magnesium:60, calcium:100,iron:2.0, zinc:0.4, selenium:1,  iodine:2,   phosphorus:45,  vitaminD:0,   vitaminB12:0,   folate:150, vitaminC:50, vitaminE:2.0, vitaminK:300, vitaminA:3500, vitaminB6:0.15, thiamine:0.05, riboflavin:0.12, niacin:0.8 },
  root_veg:   { unsaturatedFat:0.05,omega3:0.01, magnesium:20, calcium:30, iron:0.4, zinc:0.2, selenium:0.5,iodine:1,   phosphorus:44,  vitaminD:0,   vitaminB12:0,   folate:20,  vitaminC:15, vitaminE:0.5, vitaminK:10,  vitaminA:500,  vitaminB6:0.20, thiamine:0.07, riboflavin:0.04, niacin:1.0 },
  legume:     { unsaturatedFat:0.4, omega3:0.02, magnesium:45, calcium:50, iron:3.0, zinc:1.2, selenium:4,  iodine:3,   phosphorus:130, vitaminD:0,   vitaminB12:0,   folate:150, vitaminC:2,  vitaminE:0.5, vitaminK:8,   vitaminA:0,    vitaminB6:0.25, thiamine:0.20, riboflavin:0.08, niacin:1.5 },
  grain:      { unsaturatedFat:0.5, omega3:0.02, magnesium:28, calcium:15, iron:0.8, zinc:1.0, selenium:10, iodine:1,   phosphorus:100, vitaminD:0,   vitaminB12:0,   folate:30,  vitaminC:0,  vitaminE:0.4, vitaminK:2,   vitaminA:0,    vitaminB6:0.10, thiamine:0.15, riboflavin:0.03, niacin:2.0 },
  fruit:      { unsaturatedFat:0.1, omega3:0.02, magnesium:10, calcium:10, iron:0.2, zinc:0.1, selenium:0.5,iodine:0.5, phosphorus:18,  vitaminD:0,   vitaminB12:0,   folate:20,  vitaminC:40, vitaminE:0.5, vitaminK:5,   vitaminA:100,  vitaminB6:0.10, thiamine:0.03, riboflavin:0.02, niacin:0.5 },
  processed:  { unsaturatedFat:3.0, omega3:0.02, magnesium:10, calcium:20, iron:0.5, zinc:0.5, selenium:5,  iodine:5,   phosphorus:80,  vitaminD:0,   vitaminB12:0,   folate:10,  vitaminC:0,  vitaminE:0.2, vitaminK:2,   vitaminA:10,   vitaminB6:0.05, thiamine:0.10, riboflavin:0.05, niacin:1.0 },
  unknown:    { unsaturatedFat:2.0, omega3:0.05, magnesium:20, calcium:30, iron:0.8, zinc:0.8, selenium:5,  iodine:3,   phosphorus:80,  vitaminD:0,   vitaminB12:0.2, folate:20,  vitaminC:5,  vitaminE:0.3, vitaminK:5,   vitaminA:50,   vitaminB6:0.10, thiamine:0.07, riboflavin:0.07, niacin:1.5 },
};
export function getTraceNutrientsForFoodType(foodType: string, weightGrams: number): TraceNutrients {
  const profile = FOOD_TYPE_TRACE_NUTRIENTS[foodType as FoodType] || FOOD_TYPE_TRACE_NUTRIENTS['unknown'];
  const factor = weightGrams / 100;
  const result: any = {};
  for (const k of Object.keys(profile)) {
    result[k] = parseFloat(((profile as any)[k] * factor).toFixed(2));
  }
  return result as TraceNutrients;
}

export interface OilModifier {
  addedFatPer100g: number; // grams of oil absorbed per 100g of food weight
  addedSaturatedFatPer100g: number; // of that absorbed fat, how much is saturated fat (approx 15% for typical veggie/frying oil)
  addedCaloriesPer100g: number; // 9 calories per gram of fat
  addedSodiumPer100g: number; // mg of sodium added per 100g from cooking seasoning / butter / pan glazing
  description: string;
}

export const COOKING_METHOD_OIL_MODIFIERS: Record<string, OilModifier> = {
  deep_fried: { addedFatPer100g: 10.0, addedSaturatedFatPer100g: 1.5, addedCaloriesPer100g: 90.0, addedSodiumPer100g: 250.0, description: "Deep-fried" },
  pan_fried:  { addedFatPer100g: 5.0,  addedSaturatedFatPer100g: 0.75, addedCaloriesPer100g: 45.0, addedSodiumPer100g: 200.0, description: "Pan-fried" },
  stir_fried: { addedFatPer100g: 3.0,  addedSaturatedFatPer100g: 0.45, addedCaloriesPer100g: 27.0, addedSodiumPer100g: 180.0, description: "Stir-fried" },
  roasted:    { addedFatPer100g: 1.5,  addedSaturatedFatPer100g: 0.22, addedCaloriesPer100g: 13.5, addedSodiumPer100g: 150.0, description: "Roasted" },
  boiled:     { addedFatPer100g: 0.0,  addedSaturatedFatPer100g: 0.0,  addedCaloriesPer100g: 0.0,  addedSodiumPer100g: 50.0,  description: "Boiled" },
  steamed:    { addedFatPer100g: 0.0,  addedSaturatedFatPer100g: 0.0,  addedCaloriesPer100g: 0.0,  addedSodiumPer100g: 30.0,  description: "Steamed" },
  grilled:    { addedFatPer100g: 0.5,  addedSaturatedFatPer100g: 0.07, addedCaloriesPer100g: 4.5,  addedSodiumPer100g: 150.0, description: "Grilled" },
  baked:      { addedFatPer100g: 0.5,  addedSaturatedFatPer100g: 0.07, addedCaloriesPer100g: 4.5,  addedSodiumPer100g: 120.0, description: "Baked" },
  raw:        { addedFatPer100g: 0.0,  addedSaturatedFatPer100g: 0.0,  addedCaloriesPer100g: 0.0,  addedSodiumPer100g: 0.0,   description: "Raw / Uncooked" },
  unknown:    { addedFatPer100g: 0.0,  addedSaturatedFatPer100g: 0.0,  addedCaloriesPer100g: 0.0,  addedSodiumPer100g: 100.0, description: "Standard" }
};

export function calculateUniversalAddedNutrients(
  foodMatrix: string,
  cookingMethod: string,
  weightGrams: number,
  visualSheen: number = 0.5,
  visualCoating: number = 0.5,
  diningEnvironment: string = 'casual_restaurant',
  isAlreadyPrepared: boolean = false,
  hasSauceOrDressing: boolean = false
) {
  if (isAlreadyPrepared) {
    // Prepared/packaged/seasoned products already have their fat and sodium fully accounted for in their database entries.
    // Cooking additions are bypassed to prevent double-counting.
    return { addedFat: 0, addedSaturatedFat: 0, addedCalories: 0, addedSodium: 0 };
  }

  const envMults: Record<string, { sodium: number; lipid: number }> = {
    home_cooked: { sodium: 0.60, lipid: 0.60 },
    casual_restaurant: { sodium: 1.00, lipid: 1.00 },
    fast_food_chain: { sodium: 1.40, lipid: 1.40 },
    fine_dining: { sodium: 0.90, lipid: 1.30 },
    unknown: { sodium: 1.00, lipid: 1.00 }
  };
  const env = envMults[diningEnvironment] || envMults.casual_restaurant;
  const surfaceAreaFactor = weightGrams / 100;

  if (cookingMethod === 'boiled' || cookingMethod === 'steamed' || cookingMethod === 'raw' || cookingMethod === 'unknown') {
    let addedSodium = 0;
    if (cookingMethod === 'boiled' || cookingMethod === 'steamed') {
      const baseNa = hasSauceOrDressing ? 15.0 : 30.0;
      addedSodium = Math.round((surfaceAreaFactor * visualCoating * baseNa) * env.sodium);
    }
    return { addedFat: 0, addedSaturatedFat: 0, addedCalories: 0, addedSodium };
  }

  let kInternal = 0.0;
  if (foodMatrix === 'CELLULAR_STARCH') {
    if (cookingMethod === 'deep_fried') kInternal = 0.10;
    else if (cookingMethod === 'pan_fried') kInternal = 0.03;
  }

  const addedFat = (weightGrams * kInternal + surfaceAreaFactor * visualSheen * 8.0) * env.lipid;
  const addedSaturatedFat = addedFat * 0.20;
  const addedCalories = addedFat * 9.0;

  // If the dish includes a sauce or dressing (e.g. black pepper sauce, mayonnaise, gravy),
  // the sauce provides the bulk of the sodium. We still add a smaller base amount to account for baseline cooking salt.
  let addedSodium = 0;
  if (cookingMethod !== 'raw' && cookingMethod !== 'unknown') {
    const baseNa = hasSauceOrDressing ? 40.0 : 120.0;
    addedSodium = Math.round((surfaceAreaFactor * visualCoating * baseNa) * env.sodium);
  }

  return { addedFat, addedSaturatedFat, addedCalories, addedSodium };
}

export function getCookingMethodModifier(methodStr: string | null | undefined): OilModifier {
  if (!methodStr) return COOKING_METHOD_OIL_MODIFIERS.unknown;
  const normalized = methodStr.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // Direct match check
  if (COOKING_METHOD_OIL_MODIFIERS[normalized]) {
    return COOKING_METHOD_OIL_MODIFIERS[normalized];
  }

  // Substring checks
  const lower = methodStr.toLowerCase();
  if (lower.includes("deep") || lower.includes("fried_deep") || lower.includes("deepfried")) {
    return COOKING_METHOD_OIL_MODIFIERS.deep_fried;
  }
  if (lower.includes("pan") && lower.includes("fried")) {
    return COOKING_METHOD_OIL_MODIFIERS.pan_fried;
  }
  if (lower.includes("stir") && lower.includes("fried")) {
    return COOKING_METHOD_OIL_MODIFIERS.stir_fried;
  }
  if (lower.includes("fry") || lower.includes("fried")) {
    // default fried to pan_fried
    return COOKING_METHOD_OIL_MODIFIERS.pan_fried;
  }
  if (lower.includes("roast") || lower.includes("roasted")) {
    return COOKING_METHOD_OIL_MODIFIERS.roasted;
  }
  if (lower.includes("boil") || lower.includes("boiled") || lower.includes("soup")) {
    return COOKING_METHOD_OIL_MODIFIERS.boiled;
  }
  if (lower.includes("steam") || lower.includes("steamed")) {
    return COOKING_METHOD_OIL_MODIFIERS.steamed;
  }
  if (lower.includes("grill") || lower.includes("grilled") || lower.includes("char")) {
    return COOKING_METHOD_OIL_MODIFIERS.grilled;
  }
  if (lower.includes("bake") || lower.includes("baked")) {
    return COOKING_METHOD_OIL_MODIFIERS.baked;
  }
  if (lower.includes("raw") || lower.includes("fresh") || lower.includes("uncooked")) {
    return COOKING_METHOD_OIL_MODIFIERS.raw;
  }

  return COOKING_METHOD_OIL_MODIFIERS.unknown;
}

