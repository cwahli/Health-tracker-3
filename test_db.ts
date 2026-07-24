async function run() {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=2727573&pageSize=1`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data.foods[0].foodNutrients.map(n => n.nutrientName), null, 2));
}
run();
