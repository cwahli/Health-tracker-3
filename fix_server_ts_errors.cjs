const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// fix redeclaration
code = code.replace(/const nutrientKeys = \[\n\s+"calories", "protein"/g, 'const analysisNutrientKeys = [\n        "calories", "protein"');
code = code.replace(/for \(const key of nutrientKeys\) \{\n\s+parsedData\.nutrients\[key\] = 0;\n\s+\}/, 'for (const key of analysisNutrientKeys) {\n        parsedData.nutrients[key] = 0;\n      }');

// fix try catch missing braces
const regex = /catch \(firstErr: any\) \{\n\s+addDebugLog\(\`\[JSON Parse Error\] First attempt failed: \$\{firstErr\.message\}\. Retrying once\.\.\.\`\);\n\s+await new Promise\(resolve => setTimeout\(resolve, 500\)\);\n\s+\(\{ textOutput, rawParsed \} = await callAndParseFoodAnalysis\(llmCallArgs\)\);\n\s+\}/;

const replacement = `catch (firstErr: any) {
      addDebugLog(\`[JSON Parse Error] First attempt failed: \${firstErr.message}. Retrying once...\`);
      await new Promise(resolve => setTimeout(resolve, 500));
      ({ textOutput, rawParsed } = await callAndParseFoodAnalysis(llmCallArgs));
    }
`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts syntax errors');
