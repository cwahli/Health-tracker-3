async function run() {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=undefined&query=beef&pageSize=1`;
    const response = await fetch(url);
    console.log(response.status);
    const data = await response.json();
    console.log(data);
}
run();
