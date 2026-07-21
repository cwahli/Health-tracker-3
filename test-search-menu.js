fetch("http://localhost:3000/api/gemini/menu-image-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ labels: ["Beef Rendang", "Nasi Goreng"] })
}).then(res => res.json()).then(console.log).catch(console.error);
