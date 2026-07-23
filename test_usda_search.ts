import { extractUSDANutrientsPer100g } from './server_pure_helpers.ts';

async function searchUSDA() {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=2727574&pageSize=1`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(extractUSDANutrientsPer100g(data.foods[0]));
}
searchUSDA();
