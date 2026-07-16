const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = `app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ images: [], isAvailable: false });
  
  if (imageSearchCache.has(query)) {
    return res.json(imageSearchCache.get(query));
  }
  
  addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}" using Brave Search API\`);`;

const newEndpoint = `const imageSearchPromises = new Map<string, Promise<any>>();
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
      addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}" using Brave Search API\`);`;

const oldSuccess = `      addDebugLog(\`[FoodImageSearch] Successfully found images via Brave Search API!\`);
      const results = data.results.map((item: any) => ({
        title: item.title,
        imageUrl: item.properties?.url || item.properties?.placeholder || item.url,
        pageUrl: item.url
      }));
      const payload = { images: results, isAvailable: true };
      imageSearchCache.set(query, payload);
      return res.json(payload);`;

const newSuccess = `      addDebugLog(\`[FoodImageSearch] Successfully found images via Brave Search API!\`);
      const results = data.results.map((item: any) => ({
        title: item.title,
        imageUrl: item.properties?.url || item.properties?.placeholder || item.url,
        pageUrl: item.url
      }));
      const payload = { images: results, isAvailable: true };
      imageSearchCache.set(query, payload);
      return payload;`;

const oldFail = `      const errMsg = data.message || "No items returned from search.";
      addDebugLog(\`[FoodImageSearch] Brave Search API failed. Status: \${response.status}. Message: \${errMsg}\`);
      return res.json({
        images: [],
        isAvailable: false,
        error: errMsg
      });
    }
  } catch (error: any) {
    addDebugLog(\`[FoodImageSearch] Error during request: \${error.message}\`);
    return res.json({
      images: [],
      isAvailable: false,
      error: error.message
    });
  }
});`;

const newFail = `      const errMsg = data.message || "No items returned from search.";
      addDebugLog(\`[FoodImageSearch] Brave Search API failed. Status: \${response.status}. Message: \${errMsg}\`);
      return {
        images: [],
        isAvailable: false,
        error: errMsg
      };
    }
  } catch (error: any) {
    addDebugLog(\`[FoodImageSearch] Error during request: \${error.message}\`);
    return {
      images: [],
      isAvailable: false,
      error: error.message
    };
  } finally {
    imageSearchPromises.delete(query);
  }
  })();
  imageSearchPromises.set(query, searchPromise);
  const result = await searchPromise;
  return res.json(result);
});`;

if (code.includes(oldEndpoint)) {
  code = code.replace(oldEndpoint, newEndpoint);
  code = code.replace(oldSuccess, newSuccess);
  code = code.replace(oldFail, newFail);
  fs.writeFileSync('server.ts', code);
  console.log("Success patch cache concurrent");
} else {
  console.log("Failed to patch cache concurrent");
}
