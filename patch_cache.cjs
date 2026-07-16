const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const cacheDeclaration = `const app = express();`;
const newCacheDeclaration = `const app = express();
const imageSearchCache = new Map<string, any>();`;

if (code.includes(cacheDeclaration) && !code.includes('imageSearchCache = new Map')) {
  code = code.replace(cacheDeclaration, newCacheDeclaration);
}

const oldEndpoint = `app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}" using Brave Search API\`);`;

const newEndpoint = `app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ images: [], isAvailable: false });
  
  if (imageSearchCache.has(query)) {
    return res.json(imageSearchCache.get(query));
  }
  
  addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}" using Brave Search API\`);`;

const oldSuccess = `      addDebugLog(\`[FoodImageSearch] Successfully found images via Brave Search API!\`);
      const results = data.results.map((item: any) => ({
        title: item.title,
        imageUrl: item.properties?.url || item.properties?.placeholder || item.url,
        pageUrl: item.url
      }));
      return res.json({ images: results, isAvailable: true });`;

const newSuccess = `      addDebugLog(\`[FoodImageSearch] Successfully found images via Brave Search API!\`);
      const results = data.results.map((item: any) => ({
        title: item.title,
        imageUrl: item.properties?.url || item.properties?.placeholder || item.url,
        pageUrl: item.url
      }));
      const payload = { images: results, isAvailable: true };
      imageSearchCache.set(query, payload);
      return res.json(payload);`;

if (code.includes(oldEndpoint)) {
  code = code.replace(oldEndpoint, newEndpoint);
  code = code.replace(oldSuccess, newSuccess);
  fs.writeFileSync('server.ts', code);
  console.log("Success patch cache");
} else {
  console.log("Failed to patch cache");
}
