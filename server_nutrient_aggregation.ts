import { NUTRIENT_KEYS } from "./src/utils/nutrients";
import { getTraceNutrientsForFoodType, getCookingMethodModifier, calculateUniversalAddedNutrients } from "./server_food_db";
import { 
  sanitizeMealWeight, 
  sanitizeString,
  extractUSDANutrientsPer100g, 
  extractOFFNutrientsPer100g 
} from "./server_pure_helpers";

export interface AggregatedNutrientsResult {
  nutrients: Record<string, number>;
  itemsBreakdown: any[];
}

export function aggregateItemsNutrients(
  rawItems: any[],
  totalWeightGrams: number,
  dbMatchMap: Map<string, any>,
  databaseMatchesArray: any[],
  addDebugLog: (msg: string) => void
): AggregatedNutrientsResult {
  const nutrients: Record<string, number> = {};
  for (const key of NUTRIENT_KEYS) {
    nutrients[key] = 0;
  }

  const coreLabelKeys = [
    "calories", "protein", "totalFat", "saturatedFat", "transFat",
    "carbohydrates", "addedSugar", "sodium", "potassium", "totalFibre", "solubleFibre"
  ];

  const itemsBreakdown = rawItems.map((item: any) => {
    const canonicalName = sanitizeString(item.canonicalDbName || item.name, "Unspecified Item");
    const itemWeight = sanitizeMealWeight(item.weightGrams, Math.round(totalWeightGrams / rawItems.length));
    const dbSource = sanitizeString(item.dbSource, "estimated");
    const dbId = item.dbId !== undefined && item.dbId !== null ? String(item.dbId) : null;
    
    const itemNutrients: Record<string, any> = {};
    for (const key of NUTRIENT_KEYS) {
      itemNutrients[key] = 0;
    }

    const labelData = item.labelNutrientsPerServing;
    let servingSizeGrams = labelData && labelData.servingSizeGrams !== undefined && labelData.servingSizeGrams !== null
      ? Number(labelData.servingSizeGrams)
      : 0;
    if (labelData && (!servingSizeGrams || isNaN(servingSizeGrams) || servingSizeGrams <= 0)) {
      servingSizeGrams = 100;
    }

    // STEP 1: Apply LLM core-11 estimate (present for label and estimated items)
    if (labelData && servingSizeGrams > 0) {
      const scaleFactor = itemWeight / servingSizeGrams;
      for (const key of coreLabelKeys) {
        if (labelData[key] !== undefined && labelData[key] !== null) {
          itemNutrients[key] = parseFloat((Number(labelData[key]) * scaleFactor).toFixed(2));
        }
      }
      addDebugLog(`[Nutrient] "${canonicalName}" core-11 from LLM estimate (servingSizeGrams=${servingSizeGrams}).`);
    } else if (dbSource === "estimated") {
      addDebugLog(`[Nutrient Warning] "${canonicalName}" is 'estimated' but LLM did not provide labelNutrientsPerServing. Core-11 will be zero.`);
      itemNutrients.isUnverified = true;
    }

    // STEP 2: If USDA/OFF match found, override core-11 with verified DB data (reinforcement)
    if ((dbSource === "usda" || dbSource === "off") && dbId) {
      const hasInMap = dbMatchMap.has(dbId);
      const match = !hasInMap ? databaseMatchesArray.find((m: any) => m.id === dbId) : null;
      if (hasInMap) {
        const baseNutrientsPer100g = dbMatchMap.get(dbId);
        const factor = itemWeight / 100;
        for (const key of coreLabelKeys) {
          if (baseNutrientsPer100g[key] !== undefined) {
            itemNutrients[key] = parseFloat((baseNutrientsPer100g[key] * factor).toFixed(2));
          }
        }
        addDebugLog(`[Nutrient] "${canonicalName}" core-11 reinforced by USDA/OFF dbMatchMap.`);
      } else if (match) {
        const baseNutrientsPer100g = dbSource === "usda" ? extractUSDANutrientsPer100g(match) : extractOFFNutrientsPer100g(match);
        const factor = itemWeight / 100;
        for (const key of coreLabelKeys) {
          if (baseNutrientsPer100g[key] !== undefined) {
            itemNutrients[key] = parseFloat((baseNutrientsPer100g[key] * factor).toFixed(2));
          }
        }
        addDebugLog(`[Nutrient] "${canonicalName}" core-11 reinforced by USDA/OFF match object.`);
      }
    }

    // STEP 2.5: Apply cooking method modifiers (fat, calories, sodium)
    const cookingMethod = item.cookingMethod || 'unknown';
    const visualSheen = item.visualSheen !== undefined ? item.visualSheen : 0.5;
    const visualCoating = item.visualCoating !== undefined ? item.visualCoating : 0.5;
    const diningEnvironment = item.diningEnvironment || 'casual_restaurant';
    const foodMatrix = item.foodType === 'ultra_processed' ? 'CELLULAR_STARCH' : 'WHOLE_FOOD';
    
    const addedNutrients = calculateUniversalAddedNutrients(foodMatrix, cookingMethod, itemWeight, visualSheen, visualCoating, diningEnvironment);

    if ((addedNutrients.addedFat > 0 || addedNutrients.addedSodium > 0) && dbSource !== 'estimated') {
      itemNutrients.totalFat = parseFloat((itemNutrients.totalFat + addedNutrients.addedFat).toFixed(2));
      itemNutrients.saturatedFat = parseFloat((itemNutrients.saturatedFat + addedNutrients.addedSaturatedFat).toFixed(2));
      itemNutrients.calories = parseFloat((itemNutrients.calories + addedNutrients.addedCalories).toFixed(1));
      itemNutrients.sodium = parseFloat((itemNutrients.sodium + addedNutrients.addedSodium).toFixed(1));
      addDebugLog(`[Nutrient Modifier] Applied universal adhesion equation for "${canonicalName}": added +${addedNutrients.addedFat.toFixed(2)}g fat, +${addedNutrients.addedCalories.toFixed(1)} kcal, +${addedNutrients.addedSodium.toFixed(1)}mg sodium.`);
    }

    // DIETITIAN REALITY CHECK: Sodium & Macro Sanity Check
    // Raw meat or standard restaurant cooked meat/dishes shouldn't have 1000mg+ sodium per 100g unless cured/sauced
    const nameLower = canonicalName.toLowerCase();
    const isCuredOrSalted = nameLower.includes('cured') || nameLower.includes('bacon') || nameLower.includes('ham') || 
                            nameLower.includes('sausage') || nameLower.includes('soy sauce') || nameLower.includes('salted') || 
                            nameLower.includes('anchovy') || nameLower.includes('pickle') || nameLower.includes('fish sauce');
    const sodiumPer100g = (itemNutrients.sodium / itemWeight) * 100;
    if (!isCuredOrSalted && sodiumPer100g > 500) {
      const realisticSodium = Math.round((250 + (addedNutrients.addedSodium / (itemWeight / 100) || 150)) * (itemWeight / 100));
      addDebugLog(`[Dietitian Reality Check] Sodium for "${canonicalName}" (${itemNutrients.sodium}mg) was unrealistically high for a non-cured item. Reality check adjusted sodium from ${itemNutrients.sodium}mg to ${realisticSodium}mg.`);
      itemNutrients.sodium = realisticSodium;
    }

    const proteinPer100g = (itemNutrients.protein / itemWeight) * 100;
    const isProteinPowder = nameLower.includes('powder') || nameLower.includes('isolate') || nameLower.includes('whey');
    if (!isProteinPowder && proteinPer100g > 45) {
       const realisticProtein = 45 * (itemWeight / 100);
       addDebugLog(`[Dietitian Reality Check] Protein for "${canonicalName}" (${itemNutrients.protein}g) exceeded 45g/100g ceiling. Capped to ${realisticProtein}g.`);
       itemNutrients.protein = realisticProtein;
    }

    // Zero-macro fallback for essential fields
    if (isNaN(itemNutrients.calories) || itemNutrients.calories < 0) itemNutrients.calories = 0;
    if (isNaN(itemNutrients.protein) || itemNutrients.protein < 0) itemNutrients.protein = 0;
    if (isNaN(itemNutrients.totalFat) || itemNutrients.totalFat < 0) itemNutrients.totalFat = 0;
    if (isNaN(itemNutrients.carbohydrates) || itemNutrients.carbohydrates < 0) itemNutrients.carbohydrates = 0;

    // STEP 3: Derive the 20 trace nutrients from food-type classification
    const foodType = item.foodType || 'unknown';
    const traceNutrients = getTraceNutrientsForFoodType(foodType, itemWeight);
    for (const key of Object.keys(traceNutrients)) {
      itemNutrients[key] = (traceNutrients as any)[key];
    }
    addDebugLog(`[Nutrient] "${canonicalName}" trace-20 from foodType="${foodType}".`);

    // Ensure physical consistency of fats for the item
    if (itemNutrients.saturatedFat > itemNutrients.totalFat) {
      itemNutrients.totalFat = itemNutrients.saturatedFat;
    }
    if (itemNutrients.transFat > itemNutrients.totalFat) {
      itemNutrients.totalFat = itemNutrients.transFat;
    }
    if (itemNutrients.saturatedFat + itemNutrients.transFat > itemNutrients.totalFat) {
      itemNutrients.totalFat = parseFloat((itemNutrients.saturatedFat + itemNutrients.transFat).toFixed(2));
    }
    itemNutrients.unsaturatedFat = parseFloat(Math.max(0, itemNutrients.totalFat - itemNutrients.saturatedFat - itemNutrients.transFat).toFixed(2));

    // Add to aggregated nutrients
    for (const key of NUTRIENT_KEYS) {
      nutrients[key] = parseFloat((nutrients[key] + (itemNutrients[key] || 0)).toFixed(2));
    }

    return {
      name: canonicalName,
      originalLocalName: item.originalLocalName || item.originalName || null,
      weightGrams: itemWeight,
      calories: itemNutrients.calories || 0,
      saturatedFat: itemNutrients.saturatedFat || 0,
      sodium: itemNutrients.sodium || 0,
      dbSource,
      dbId,
      isUnverified: itemNutrients.isUnverified || false,
      cookingMethod: item.cookingMethod || null,
      boundingBox2D: item.boundingBox2D || null,
      sourceImageIndex: item.sourceImageIndex !== undefined ? item.sourceImageIndex : null
    };
  });

  return {
    nutrients,
    itemsBreakdown
  };
}
