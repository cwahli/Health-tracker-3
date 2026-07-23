import { extractUSDANutrientsPer100g } from './server_pure_helpers.ts';

const food = {
  foodNutrients: [
    { nutrientName: "Energy", value: 255, unitName: "KCAL" },
    { nutrientName: "Energy", value: 1067, unitName: "kJ" },
    { nutrient: { name: "Protein", unitName: "g" }, amount: 32.2 }
  ]
};

console.log(extractUSDANutrientsPer100g(food));
