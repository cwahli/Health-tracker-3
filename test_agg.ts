import { aggregateItemsNutrients } from './server_nutrient_aggregation.ts';

const dbMatchMap = new Map([
  ["2727574", { calories: 255, protein: 32.2, totalFat: 13.5, sodium: 82 }]
]);

const items = [
  {
    name: "Beef Steak with Black Pepper Sauce",
    weightGrams: 200,
    primaryBaseWeightG: 160,
    saucesDetailList: [
      { weightGrams: 40, protein: 0.3, calories: 15, sodium: 301, saturatedFat: 0.6 }
    ],
    dbId: "2727574",
    dbSource: "usda",
    cookingMethod: "pan_fried"
  }
];

const res = aggregateItemsNutrients(items, dbMatchMap);
console.log(JSON.stringify(res, null, 2));
