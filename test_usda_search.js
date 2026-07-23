async function searchUSDA(query) {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=2727574&pageSize=2`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
}
searchUSDA();
