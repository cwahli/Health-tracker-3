const fs = require('fs');
const { extractUSDANutrientsPer100g } = require('./dist/server_pure_helpers.js');

const food = {
  foodNutrients: [
    { nutrientName: "Energy", value: 255, unitName: "KCAL" },
    { nutrient: { name: "Protein", unitName: "g" }, amount: 32.2 }
  ]
};

console.log(extractUSDANutrientsPer100g(food));
