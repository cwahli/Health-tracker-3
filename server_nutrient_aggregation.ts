import { NUTRIENT_KEYS } from "./src/utils/nutrients";
import { getTraceNutrientsForFoodType, getCookingMethodModifier, calculateUniversalAddedNutrients } from "./server_food_db";
import { 
  sanitizeMealWeight, 
  sanitizeString,
  extractUSDANutrientsPer100g, 
  extractOFFNutrientsPer100g,
  checkIfItemIsAlreadyPrepared,
  applyNutrientRealityChecks
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

    if (item.primaryBase100g) {
      // It's a multi-component item! Calculate base and sauces and cooking method additions deterministically
      const raw100 = { ...item.primaryBase100g };
      const itemWeightG = itemWeight;
      
      let baseW = item.primaryBaseWeightG || itemWeightG;
      let sauceWSum = 0;
      let scaleRatio = 1;
      
      if (item.saucesDetailList && item.saucesDetailList.length > 0) {
        sauceWSum = item.saucesDetailList.reduce((acc: number, s: any) => acc + (s.weightGrams || 0), 0);
      }
      
      if (item.primaryBaseWeightG) {
         const originalWeight = item.primaryBaseWeightG + sauceWSum;
         if (originalWeight > 0 && Math.abs(originalWeight - itemWeightG) > 2) {
            scaleRatio = itemWeightG / originalWeight;
            baseW = Math.round(item.primaryBaseWeightG * scaleRatio);
         }
      } else if (sauceWSum > 0) {
         if (baseW === itemWeightG && sauceWSum < itemWeightG) {
            baseW = Math.max(10, itemWeightG - sauceWSum);
         }
      }

      const baseFactor = baseW / 100;

      // 1. Calculate base ingredient nutrients
      const portionBaseCal = Math.round((raw100.calories || 0) * baseFactor);
      const portionBaseP = Math.round((raw100.protein || 0) * baseFactor * 10) / 10;
      const portionBaseFat = Math.round((raw100.totalFat || 0) * baseFactor * 10) / 10;
      const portionBaseSatFat = Math.round((raw100.saturatedFat || 0) * baseFactor * 10) / 10;
      const portionBaseTransFat = Math.round((raw100.transFat || 0) * baseFactor * 10) / 10;
      const portionBaseNa = Math.round((raw100.sodium || 0) * baseFactor);
      const portionBaseCarbs = Math.round((raw100.carbohydrates || 0) * baseFactor * 10) / 10;

      let sumCal = portionBaseCal;
      let sumP = portionBaseP;
      let sumFat = portionBaseFat;
      let sumSatFat = portionBaseSatFat;
      let sumTransFat = portionBaseTransFat;
      let sumNa = portionBaseNa;
      let sumCarbs = portionBaseCarbs;

      // 2. Add sauces
      if (item.saucesDetailList && Array.isArray(item.saucesDetailList) && item.saucesDetailList.length > 0) {
        item.saucesDetailList.forEach((s: any) => {
          const sCal = Math.round((s.calories || 0) * scaleRatio);
          const sP = Math.round((s.protein || 0) * scaleRatio * 10) / 10;
          const sF = Math.round((s.totalFat || 0) * scaleRatio * 10) / 10;
          const sSatFat = Math.round((s.saturatedFat !== undefined ? s.saturatedFat : 0.3) * scaleRatio * 10) / 10;
          const sTransFat = Math.round((s.transFat || 0) * scaleRatio * 10) / 10;
          const sNa = Math.round((s.sodium || 0) * scaleRatio);
          const sCarbs = Math.round((s.carbohydrates || 0) * scaleRatio * 10) / 10;

          sumCal += sCal;
          sumP += sP;
          sumFat += sF;
          sumSatFat += sSatFat;
          sumTransFat += sTransFat;
          sumNa += sNa;
          sumCarbs += sCarbs;
        });
      }

      // 3. Add cooking modifiers
      let cookingCal = 0;
      let cookingFat = 0;
      let cookingSatFat = 0;
      let cookingNa = 0;

      if (item.cookingAdded) {
        cookingCal = Math.round(item.cookingAdded.addedCalories || 0);
        cookingFat = Math.round((item.cookingAdded.addedFat || 0) * 10) / 10;
        cookingSatFat = Math.round((item.cookingAdded.addedSaturatedFat || 0) * 10) / 10;
        cookingNa = Math.round(item.cookingAdded.addedSodium || 0);
      } else {
        let rawMethod = (item.cookingMethod && item.cookingMethod !== 'unknown') ? item.cookingMethod : null;
        if (!rawMethod) {
          const kwLower = (item.keyword || item.name || "").toLowerCase();
          if (kwLower.includes('wedge') || kwLower.includes('fries') || kwLower.includes('chip') || kwLower.includes('nugget')) {
            rawMethod = 'deep_fried';
          } else if (kwLower.includes('vegetable') || kwLower.includes('veg') || kwLower.includes('corn') || kwLower.includes('pea') || kwLower.includes('carrot') || kwLower.includes('broccoli')) {
            rawMethod = 'boiled';
          } else {
            rawMethod = 'pan_fried';
          }
        }
        if (rawMethod !== 'raw' && rawMethod !== 'unknown') {
          const kwLower = (item.keyword || item.name || "").toLowerCase();
          const foodMatrix = (kwLower.includes('potato') || kwLower.includes('chip') || kwLower.includes('fry') || kwLower.includes('wedge')) ? 'CELLULAR_STARCH' : 'WHOLE_FOOD';
          const hasSauces = (item.saucesDetailList && item.saucesDetailList.length > 0 && item.saucesDetailList.some((s: any) => (s.sodium || 0) > 0)) ||
            Boolean((item.name || item.canonicalDbName || "").toLowerCase().match(/\b(sauce|mayo|mayonnaise|dressing|gravy|salsa)\b/));
          const calcAdded = calculateUniversalAddedNutrients(foodMatrix, rawMethod, itemWeightG, 0.5, 0.5, 'casual_restaurant', false, hasSauces);
          cookingCal = Math.round(calcAdded.addedCalories);
          cookingFat = Math.round(calcAdded.addedFat * 10) / 10;
          cookingSatFat = Math.round(calcAdded.addedSaturatedFat * 10) / 10;
          cookingNa = Math.round(calcAdded.addedSodium);
        }
      }

      sumCal += cookingCal;
      sumFat += cookingFat;
      sumSatFat += cookingSatFat;
      sumNa += cookingNa;

      itemNutrients.calories = sumCal;
      itemNutrients.protein = parseFloat(sumP.toFixed(2));
      itemNutrients.totalFat = parseFloat(sumFat.toFixed(2));
      itemNutrients.saturatedFat = parseFloat(sumSatFat.toFixed(2));
      itemNutrients.transFat = parseFloat(sumTransFat.toFixed(2));
      itemNutrients.sodium = sumNa;
      itemNutrients.carbohydrates = parseFloat(sumCarbs.toFixed(2));

      addDebugLog(`[Nutrient] "${canonicalName}" computed DETERMINISTICALLY by summing components: Cal=${sumCal}, Protein=${sumP}, Fat=${sumFat}, SatFat=${sumSatFat}, Sodium=${sumNa}`);
    } else {
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
      if ((dbSource === "usda" || dbSource === "off" || dbSource === "backend_calculated") && dbId) {
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
    }

    // STEP 2.5: Apply cooking method modifiers (fat, calories, sodium)
    const cookingMethod = item.cookingMethod || 'unknown';
    const visualSheen = item.visualSheen !== undefined ? item.visualSheen : 0.5;
    const visualCoating = item.visualCoating !== undefined ? item.visualCoating : 0.5;
    const diningEnvironment = item.diningEnvironment || 'casual_restaurant';
    const nameLowerForMatrix = canonicalName.toLowerCase();
    const foodMatrix = (item.foodType === 'ultra_processed' || item.foodType === 'root_veg' || nameLowerForMatrix.includes('potato') || nameLowerForMatrix.includes('wedge') || nameLowerForMatrix.includes('fry') || nameLowerForMatrix.includes('fries') || nameLowerForMatrix.includes('chip')) ? 'CELLULAR_STARCH' : 'WHOLE_FOOD';
    
    // Check if the item is already prepared or seasoned to avoid "double-salting"
    let baselineSodium: number | undefined = undefined;
    if (item.primaryBase100g && item.primaryBase100g.sodium !== undefined) {
      baselineSodium = item.primaryBase100g.sodium;
    } else if (item.labelNutrientsPerServing && item.labelNutrientsPerServing.sodium !== undefined) {
      baselineSodium = item.labelNutrientsPerServing.sodium;
    }
    const isAlreadyPrepared = checkIfItemIsAlreadyPrepared(canonicalName, item.keyword || "", dbSource, baselineSodium);
    const hasSauceOrDressing = (item.saucesDetailList && item.saucesDetailList.length > 0 && item.saucesDetailList.some((s: any) => (s.sodium || 0) > 0)) ||
      Boolean((canonicalName || "").toLowerCase().match(/\b(sauce|mayo|mayonnaise|dressing|gravy|salsa)\b/));

    const addedNutrients = calculateUniversalAddedNutrients(
      foodMatrix, 
      cookingMethod, 
      itemWeight, 
      visualSheen, 
      visualCoating, 
      diningEnvironment,
      isAlreadyPrepared,
      hasSauceOrDressing
    );

    if ((addedNutrients.addedFat > 0 || addedNutrients.addedSodium > 0) && dbSource !== 'estimated' && !item.primaryBase100g) {
      itemNutrients.totalFat = parseFloat((itemNutrients.totalFat + addedNutrients.addedFat).toFixed(2));
      itemNutrients.saturatedFat = parseFloat((itemNutrients.saturatedFat + addedNutrients.addedSaturatedFat).toFixed(2));
      itemNutrients.calories = parseFloat((itemNutrients.calories + addedNutrients.addedCalories).toFixed(1));
      itemNutrients.sodium = parseFloat((itemNutrients.sodium + addedNutrients.addedSodium).toFixed(1));
      addDebugLog(`[Nutrient Modifier] Applied universal adhesion equation for "${canonicalName}": added +${addedNutrients.addedFat.toFixed(2)}g fat, +${addedNutrients.addedCalories.toFixed(1)} kcal, +${addedNutrients.addedSodium.toFixed(1)}mg sodium.`);
    }

    // DIETITIAN REALITY CHECK: Sodium & Macro Sanity Check (Consolidated)
    applyNutrientRealityChecks(
      canonicalName,
      itemWeight,
      itemNutrients,
      addedNutrients.addedSodium,
      addDebugLog
    );

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
      protein: itemNutrients.protein || 0,
      totalFat: itemNutrients.totalFat || 0,
      saturatedFat: itemNutrients.saturatedFat || 0,
      transFat: itemNutrients.transFat || 0,
      carbohydrates: itemNutrients.carbohydrates || 0,
      addedSugar: itemNutrients.addedSugar || 0,
      sodium: itemNutrients.sodium || 0,
      potassium: itemNutrients.potassium || 0,
      totalFibre: itemNutrients.totalFibre || 0,
      solubleFibre: itemNutrients.solubleFibre || 0,
      labelNutrientsPerServing: item.labelNutrientsPerServing || null,
      dbSource,
      dbId,
      isUnverified: itemNutrients.isUnverified || false,
      cookingMethod: item.cookingMethod || null,
      boundingBox2D: item.boundingBox2D || null,
      sourceImageIndex: item.sourceImageIndex !== undefined ? item.sourceImageIndex : null,
      components: item.components || null,
      visualIngredients: item.visualIngredients || null,
      saucesDetailList: item.saucesDetailList || [],
      primaryBase100g: item.primaryBase100g || null,
      primaryBaseMatchName: item.primaryBaseMatchName || null,
      primaryBaseWeightG: item.primaryBaseWeightG || null,
      cookingAdded: item.cookingAdded || null
    };
  });

  return {
    nutrients,
    itemsBreakdown
  };
}
