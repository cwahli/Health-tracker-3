const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Move agent1Step1Schema down to where we can access biomarkerDefinitions and userProfile
// Remove it from the top:
content = content.replace(
/    const agent1Step1Schema = \{\s*type: Type\.OBJECT,[\s\S]*?estimatedTotalMarkers"\]\s*\};\s*/, 
''
);

// We need to define schema near generationConfig
// Search for `const generationConfig = {`
const newSchemaDef = `
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
`;

content = content.replace(
  /(\s*)(const generationConfig = \{)/,
  `$1${newSchemaDef.trim()}\n$1$2`
);

// Change `agentType === "agent1"` responseSchema to also use this schema
content = content.replace(
  /responseSchema: agentType === "agent1_step1" \? agent1Step1Schema : undefined/,
  'responseSchema: (agentType === "agent1_step1" || agentType === "agent1") ? agent1Step1Schema : undefined'
);
content = content.replace(
  /responseMimeType: \(agentType === "agent4" \|\| agentType === "agent1_step1" \|\| agentType === "data_review"\) \? "application\/json" : "text\/plain"/,
  'responseMimeType: (agentType === "agent4" || agentType === "agent1_step1" || agentType === "agent1" || agentType === "data_review") ? "application/json" : "text/plain"'
);


// 2. Replace instructions for agent1_step1
content = content.replace(
  /required_output_format:[\s\S]*?update_data:[^\n]*\n=== EXISTING DATABASE KEYS ===[\s\S]*?\]\`;/,
  `required_output_format:
  "You must output your response strictly adhering to the provided JSON schema. Do not include markdown formatting or conversational text outside the JSON object. All extracted biomarkers MUST be placed inside the extractedData array."
rules_for_inputs:
  raw_data_extraction: "Extract only from raw text/report. Do NOT extract from pre-existing logs."
  continue_extracting: "Append next chunk of up to \${itemsPerBatch} biomarkers. Combine and return complete combined extractedData array."
  update_data: "Support editing, adding, or deleting biomarkers in the extractedData array."\`;`
);

// 3. Replace instructions for agent1
content = content.replace(
  /=== FORMAT & SYSTEM RESTRICTIONS ===[\s\S]*?potentialMedicalConditions:[\s\S]*?'- Hepatitis Stress'/g,
  `=== FORMAT & SYSTEM RESTRICTIONS ===
Your output MUST be ONLY valid JSON strictly adhering to the provided JSON schema. Do not include markdown formatting or conversational text outside the JSON object. All extracted biomarkers MUST be placed inside the extractedData array.`
);

// 4. Also fix the canonical ID dictionary mapping for agent1_step1
content = content.replace(
  /dictionary_mapping: "When extracting biomarkers, you MUST map the extracted name to the standard canonical aliases provided. If a match is found, use the canonical ID. Do not invent new keys if a synonym exists. If completely absent from existing keys, generate a clean, lowercase snake_case key."/,
  `dictionary_mapping: "You are strictly forbidden from inventing new biomarker keys. You must only select keys from the provided enum list in the JSON schema."`
);
content = content.replace(
  /4. Dictionary Mapping \(MANDATORY\): When extracting biomarkers, you MUST map the extracted name to the standard canonical aliases provided. If a match is found, use the canonical ID. Do not invent new keys if a synonym exists. ONLY if absent, you may generate a clean snake_case key./,
  `4. Dictionary Mapping (MANDATORY): You are strictly forbidden from inventing new biomarker keys. You must only select keys from the provided enum list in the JSON schema.`
);

// 5. Update the parsing in agent1_step1 response handler
content = content.replace(
  /if \(parsed\.extractedYaml\) \{[\s\S]*?cleanYaml = parsed\.extractedYaml;[\s\S]*?\}/,
  `if (parsed.extractedData) {
            cleanYaml = parsed.extractedData;
          } else if (parsed.extractedYaml) {
            cleanYaml = parsed.extractedYaml;
          }`
);

// 6. Fix agentType === "agent1" handler
content = content.replace(
  /if \(agentType === "agent1"\) \{\s*let cleanYaml = textOutput\.replace\(\/```\(\?:yaml\)\?\/gi, ""\)\.trim\(\);\s*return res\.json\(\{[\s\S]*?\}\);\s*\}/,
  `if (agentType === "agent1") {
        let parsedRows = [];
        try {
          const parsed = JSON.parse(textOutput.replace(/${'`'}${'`'}${'`'}(?:json)?/gi, "").trim());
          if (parsed.extractedData) parsedRows = parsed.extractedData;
        } catch (e) {
          console.error("agent1 JSON parse error", e);
        }
        return res.json({
          text: "",
          agentType,
          extractedYaml: parsedRows,
          hasMoreMarkers: false,
          remainingText: "",
          estimatedTotalMarkers: 0,
          agentPrompt: fullPromptSent,
          apiCalls: [{ type: 'gemini', label: \`Medical History Agent (\${engine || 'gemini-3.1-flash-lite'})\` }]
        });
      }`
);

fs.writeFileSync('server.ts', content);
