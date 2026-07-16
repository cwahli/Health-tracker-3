const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// Endpoint for custom food image search using Brave Search API');
const endIdx = code.indexOf('// Endpoint to fetch real-time agent thinking process logs');

if (startIdx !== -1 && endIdx !== -1) {
  const newCode = `// Endpoint for custom food image search using Brave Search API
const imageSearchPromises = new Map<string, Promise<any>>();
app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ images: [], isAvailable: false });
  
  if (imageSearchCache.has(query)) {
    return res.json(imageSearchCache.get(query));
  }
  
  if (imageSearchPromises.has(query)) {
    const payload = await imageSearchPromises.get(query);
    return res.json(payload);
  }
  
  const searchPromise = (async () => {
    try {
      addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}" using Brave Search API\`);
      const apiKey = process.env.BRAVE_API_KEY || "BSAOKS3uObe_D64mK-K6K6NfOsnv_e5I";
      
      if (!apiKey) {
        return {
          images: [],
          isAvailable: false,
          error: "Brave Search API Key (BRAVE_API_KEY) is not configured in environment variables."
        };
      }
      
      const url = \`https://api.search.brave.com/res/v1/images/search?q=\${encodeURIComponent(query)}&count=5\`;
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": apiKey
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.results && data.results.length > 0) {
        addDebugLog(\`[FoodImageSearch] Successfully found images via Brave Search API!\`);
        const results = data.results.map((item: any) => ({
          title: item.title,
          imageUrl: item.properties?.url || item.properties?.placeholder || item.url,
          pageUrl: item.url
        }));
        const payload = { images: results, isAvailable: true };
        imageSearchCache.set(query, payload);
        return payload;
      } else {
        const errMsg = data.message || "No items returned from search.";
        addDebugLog(\`[FoodImageSearch] Brave Search API failed. Status: \${response.status}. Message: \${errMsg}\`);
        return {
          images: [],
          isAvailable: false,
          error: \`Brave Search Error (\${response.status}): \${errMsg}\`
        };
      }
    } catch (error: any) {
      console.error("[FoodImageSearch Error]:", error);
      return {
        images: [],
        isAvailable: false,
        error: \`Network Error: \${error.message || "Failed to contact Brave Search API."}\`
      };
    } finally {
      imageSearchPromises.delete(query);
    }
  })();
  
  imageSearchPromises.set(query, searchPromise);
  const result = await searchPromise;
  return res.json(result);
});

`;

  code = code.substring(0, startIdx) + newCode + code.substring(endIdx);
  fs.writeFileSync('server.ts', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start or end index.");
}
