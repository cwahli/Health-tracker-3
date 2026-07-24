const { extractUSDANutrientsPer100g } = require('./dist/server_pure_helpers.cjs');
console.log("USDA:", extractUSDANutrientsPer100g({ foodNutrients: [ { nutrientName: "Protein", value: 22 } ] }));
