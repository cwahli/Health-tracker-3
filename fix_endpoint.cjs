const fs = require('fs');
const filepath = 'server.ts';
let content = fs.readFileSync(filepath, 'utf8');

const targetStart = 'app.post("/api/gemini/food-image-search", async (req, res) => {';
const targetEnd = '// If Gemini succeeds, return isAvailable: true';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf('});', content.indexOf('res.json({', startIndex)); // This is tricky.

// Let's use the line numbers to be sure.
const lines = content.split('\n');
const startLine = 5050; // The comment before app.post
const endLine = 5153; // The closing of the app.post

const newEndpoint = `// Endpoint for custom food image search using either Google Custom Search or Gemini fallback
app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query } = req.body;
  addDebugLog(\`[FoodImageSearch] Searching for images of "\${query}"\`);
  
  try {
    // 1. Try real Custom Search Engine first if Custom_Search_API is defined
    const apiKey = process.env.Custom_Search_API || "AIzaSyDGpOvUtgu7fEbpgms1ICuvFvJxi8DMGvA";
    const cx = process.env.Custom_Search_CX || "40e028bbf9ec84932";
    
    if (apiKey && apiKey !== "AIzaSyDGpOvUtgu7fEbpgms1ICuvFvJxi8DMGvA") {
      try {
        const url = \`https://www.googleapis.com/customsearch/v1?key=\${apiKey}&cx=\${cx}&q=\${encodeURIComponent(query)}&searchType=image&num=2\`;
        const cseRes = await fetch(url);
        const data = await cseRes.json();
        
        if (cseRes.ok && data.items && data.items.length >= 2) {
          addDebugLog(\`[FoodImageSearch] Successfully found images via Google CSE!\`);
          const results = data.items.slice(0, 2).map((item: any) => ({
            title: item.title,
            imageUrl: item.link,
            pageUrl: item.image?.contextLink || \`https://www.google.com/search?q=\${encodeURIComponent(query)}\`
          }));
          return res.json({ images: results, isAvailable: true });
        } else {
          addDebugLog(\`[FoodImageSearch] Google CSE did not return valid items or failed. Status: \${cseRes.status}. Message: \${data.error?.message || "No items found"}\`);
        }
      } catch (cseErr: any) {
        addDebugLog(\`[FoodImageSearch] Google CSE call threw exception: \${cseErr.message}\`);
      }
    }
    addDebugLog(\`[FoodImageSearch] Using Chained Gemini Search Grounding fallback...\`);
    // 2. Fallback to Chained Gemini Google Search Grounding to find real, active food image URLs
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    const aiClient = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    // Step 2.1: Perform web search using googleSearch grounding tool. Plain text response.
    const searchResponse = await aiClient.models.generateContent({
      model: "gemini-2.5-flash", // gemini-2.5-flash is widely supported for grounding tools
      contents: \`Perform a google search to find 2 real, high-quality, valid image URLs of the dish: "\${query}" as well as Google Search links or GoFood links. Describe the images and output their direct links.\`,
      config: {
        tools: [{ googleSearch: {} }] // Enforces real-time search grounding
      }
    });
    // Step 2.2: Use another call with responseMimeType: "application/json" to structure the links found into the schema.
    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite", // Fast structured parser
      contents: \`We performed a web search for "\${query}" and found the following search details:
---
\${searchResponse.text}
---
Extract the top 2 matching images. For each image, extract:
1. Title
2. Direct Image URL (must be a valid, working image URL from the search grounding results or high-quality Unsplash food image)
3. Source Page URL
Format the output strictly to match the requested JSON schema.\`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            images: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                  pageUrl: { type: Type.STRING }
                },
                required: ["title", "imageUrl", "pageUrl"]
              }
            }
          },
          required: ["images"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    if (parsed.images && parsed.images.length > 0) {
      addDebugLog(\`[FoodImageSearch] Successfully found images via Chained Gemini Grounding! Count: \${parsed.images.length}\`);
      return res.json({ images: parsed.images.slice(0, 2), isAvailable: true });
    }
    res.json({
      images: [],
      isAvailable: false,
      error: "Image search is currently unavailable."
    });
  } catch (error: any) {
    console.error("[FoodImageSearch Error]:", error);
    addDebugLog(\`[FoodImageSearch] Error: \${error.message}\`);
    res.json({
      images: [],
      isAvailable: false,
      error: \`Image search is currently unavailable (\${error.message || "service temporary unavailable"}).\`
    });
  }
});`;

// Replace lines
const newLines = [...lines.slice(0, startLine - 1), newEndpoint, ...lines.slice(endLine)];
fs.writeFileSync(filepath, newLines.join('\n'), 'utf8');
console.log('Fixed /api/gemini/food-image-search endpoint in server.ts');
