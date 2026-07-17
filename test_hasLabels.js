const activeScoutItems = [
  {
    "keyword": "bread",
    "estimatedWeightGrams": 220,
    "originalName": "Mr. Bread",
    "source": "label",
    "rawNutritionLabel": {
        "servingSize": "44 g",
        "servingsPerPack": "5",
        "calories": 120,
        "energyFromFat": 20,
        "saturatedFat": 10,
        "totalFat": "2.5 g",
        "protein": "4 g",
        "carbohydrate": "21 g",
        "sugar": "2 g",
        "sodium": "150 mg"
      }
  }
];

const processedItems = activeScoutItems.map(item => {
    if (!item) return item;
    let parsedRaw = item.rawNutritionLabel;
    if (typeof parsedRaw === 'string') {
      try { parsedRaw = JSON.parse(parsedRaw.replace(/'/g, '"')); } catch (e) { parsedRaw = null; }
    }
    let parsedFacts = item.nutritionFacts;
    if (typeof parsedFacts === 'string') {
      try { parsedFacts = JSON.parse(parsedFacts.replace(/'/g, '"')); } catch (e) { parsedFacts = null; }
    }
    return { ...item, rawNutritionLabel: parsedRaw, nutritionFacts: parsedFacts };
  });

  const hasLabels = processedItems.some((item) => {
    if (!item || !item.rawNutritionLabel || typeof item.rawNutritionLabel !== 'object') {
      return false;
    }
    const keys = Object.keys(item.rawNutritionLabel);
    if (keys.length === 0) return false;
    return keys.some(k => {
      const val = item.rawNutritionLabel[k];
      return val !== undefined && val !== null && val !== '' && val !== '-' && val !== '--';
    });
  });

console.log(hasLabels);
