import re

with open('server.ts', 'r') as f:
    content = f.read()

fallback_replacement = """          rawFoodData.itemsBreakdown = visionScoutItems.map((item: any) => {
            const bestMatch = databaseMatchesArray.find((m: any) => 
              m.name.toLowerCase().includes(item.keyword.split(' ').pop()) ||
              item.keyword.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
            );
            
            let labelNutrients = null;
            if (item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0) {
              labelNutrients = {
                servingSizeGrams: 100,
                calories: Number(item.nutritionFacts.caloriesPer100g) || 0,
                protein: Number(item.nutritionFacts.proteinPer100g) || 0,
                totalFat: Number(item.nutritionFacts.fatPer100g) || 0,
                saturatedFat: 0,
                transFat: 0,
                carbohydrates: Number(item.nutritionFacts.carbsPer100g) || 0,
                addedSugar: 0,
                sodium: 0,
                potassium: 0,
                totalFibre: 0,
                solubleFibre: 0
              };
            }
            
            return {
              canonicalDbName: item.keyword,
              weightGrams: String(sanitizeMealWeight(item.estimatedWeightGrams, 100)),
              dbSource: labelNutrients ? 'label' : (bestMatch ? (bestMatch.source === 'usda' ? 'usda' : 'off') : 'estimated'),
              dbId: bestMatch ? bestMatch.id : null,
              labelNutrientsPerServing: labelNutrients,
              foodType: 'unknown'
            };
          });"""

pattern = r'rawFoodData\.itemsBreakdown = visionScoutItems\.map\(\(item: any\) => \{.*?\n          \}\);'
content = re.sub(pattern, fallback_replacement, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)

