const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(mode === "evaluation"\) \{\s*addDebugLog\(\`\[Mode Routing\] EVALUATION mode triggered\.\`\);\s*const comparisonData = rawParsed\.comparison \|\| \{ keyNutrientConcern: "Nutrients", foods: \[\] \};\s*comparisonData\.isMenuScale = isMenuScale;/;

const replacement = `if (mode === "evaluation") {
      addDebugLog(\`[Mode Routing] EVALUATION mode triggered.\`);
      const comparisonData = rawParsed.comparison || { keyNutrientConcern: "Nutrients", groups: [] };
      comparisonData.isMenuScale = isMenuScale;
      
      return res.json({
        mode: "evaluation",
        comparison: comparisonData,
        scoutItems: visionScoutItems, // ensure the client has the bounding boxes
        agentPrompt: fullPromptSent,
        message: rawParsed.message
      });
    }`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
console.log('server.ts mode D return patched');
