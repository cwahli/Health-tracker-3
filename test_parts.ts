import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function main() {
  console.log("Testing gemini-3.1-flash-lite with ThinkingLevel.HIGH...");
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite",
      contents: "Solve 2348 * 914 step-by-step. Go slowly and explain each sub-calculation.",
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        }
      }
    });

    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          console.log("RAW PART:", JSON.stringify(part));
        }
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message || err);
  }
}

main();
