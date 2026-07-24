import { extractUSDANutrientsPer100g } from './server_pure_helpers.ts';
const mockFood = {
  foodNutrients: [
    { nutrientName: "Energy (Atwater General Factors)", value: 140, unitName: "kcal" },
    { nutrientName: "Protein", value: 22, unitName: "g" },
    { nutrientName: "Total lipid (fat)", value: 5.71, unitName: "g" },
    { nutrientName: "Fatty acids, total saturated", value: 2.5, unitName: "g" },
    { nutrientName: "Sodium, Na", value: 42, unitName: "mg" }
  ]
};
console.log(extractUSDANutrientsPer100g(mockFood));
