import { extractUSDANutrientsPer100g } from './server_pure_helpers.ts';

const dbMatchObj = {
  id: "2727574",
  source: "usda",
  searchQuery: "raw beef steak",
  name: "Beef, top sirloin steak, raw",
  calories: "140",
  protein: 22,
  fat: 5.71,
  saturatedFat: 2.5,
  sodium: 42
};

console.log("Result:", extractUSDANutrientsPer100g(dbMatchObj));
