const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    if (agentType === "agent4") {
      recentMeals = [];
      biomarkerHistory = [];
      
    const allBiomarkerKeys = Array.from(new Set([
      ...biomarkerDefinitions.map(d => d.key),
      ...Object.keys(userProfile?.customBiomarkers || {})
    ]));
    
    const agent1Step1Schema = {
      type: Type.OBJECT,
      properties: {
        extractedData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              biomarker: {
                type: Type.STRING,
                description: "The canonical ID of the biomarker.",
                enum: allBiomarkerKeys.length > 0 ? allBiomarkerKeys : ["unknown_biomarker"]
              },
              date: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
              updated_at: { type: Type.INTEGER },
              numeric_value: { type: Type.NUMBER, description: "The exact numerical value if quantitative. Leave null if qualitative.", nullable: true },
              qualitative_value: { type: Type.STRING, description: "The exact string if qualitative (e.g., 'NEGATIVE'). Leave null if quantitative.", nullable: true },
              unit: { type: Type.STRING, description: "The exact unit verbatim from the text. Leave empty string if none." },
              explanation: { type: Type.STRING, description: "Why or how it was mapped." }
            },
            required: ["biomarker", "date", "updated_at", "unit", "explanation"]
          }
        },
        text: { type: Type.STRING, description: "Friendly clinical conversational message to the user." },
        hasMoreMarkers: { type: Type.BOOLEAN },
        remainingText: { type: Type.STRING },
        estimatedTotalMarkers: { type: Type.INTEGER }
      },
      required: ["extractedData", "text", "hasMoreMarkers", "remainingText", "estimatedTotalMarkers"]
    };
    if (history && history.length > 0) {
        history = history.filter((h: any) => {`;

const newStr = `    const allBiomarkerKeys = Array.from(new Set([
      ...biomarkerDefinitions.map(d => d.key),
      ...Object.keys(userProfile?.customBiomarkers || {})
    ]));
    
    const agent1Step1Schema = {
      type: Type.OBJECT,
      properties: {
        extractedData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              biomarker: {
                type: Type.STRING,
                description: "The canonical ID of the biomarker.",
                enum: allBiomarkerKeys.length > 0 ? allBiomarkerKeys : ["unknown_biomarker"]
              },
              date: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
              updated_at: { type: Type.INTEGER },
              numeric_value: { type: Type.NUMBER, description: "The exact numerical value if quantitative. Leave null if qualitative.", nullable: true },
              qualitative_value: { type: Type.STRING, description: "The exact string if qualitative (e.g., 'NEGATIVE'). Leave null if quantitative.", nullable: true },
              unit: { type: Type.STRING, description: "The exact unit verbatim from the text. Leave empty string if none." },
              explanation: { type: Type.STRING, description: "Why or how it was mapped." }
            },
            required: ["biomarker", "date", "updated_at", "unit", "explanation"]
          }
        },
        text: { type: Type.STRING, description: "Friendly clinical conversational message to the user." },
        hasMoreMarkers: { type: Type.BOOLEAN },
        remainingText: { type: Type.STRING },
        estimatedTotalMarkers: { type: Type.INTEGER }
      },
      required: ["extractedData", "text", "hasMoreMarkers", "remainingText", "estimatedTotalMarkers"]
    };

    if (agentType === "agent4") {
      recentMeals = [];
      biomarkerHistory = [];
      if (history && history.length > 0) {
        history = history.filter((h: any) => {`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('server.ts', content);
  console.log("Replaced successfully via exact string match.");
} else {
  console.log("Could not find the exact string.");
}
