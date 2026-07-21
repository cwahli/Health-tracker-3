fetch("http://localhost:3000/api/gemini/food-image-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "apple", mode: "complete" })
}).then(res => res.json()).then(console.log).catch(console.error);
