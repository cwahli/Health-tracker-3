const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The first fix replaced the one around 2184, which was causing the error. 
// We should use an entirely different name for the second one, or just re-assign instead of re-declaring.
// Let's replace 'const analysisNutrientKeys =' with 'const analysisNutrientKeys2 =' in the second occurrence (around 2184)
let lines = code.split('\n');
let replaced = false;

for (let i = 2100; i < 2250; i++) {
  if (lines[i] && lines[i].includes('const analysisNutrientKeys = [')) {
    lines[i] = lines[i].replace('const analysisNutrientKeys = [', 'const evaluationNutrientKeys = [');
    replaced = true;
    break;
  }
}

if (replaced) {
  for (let i = 2100; i < 2250; i++) {
    if (lines[i] && lines[i].includes('for (const key of analysisNutrientKeys) {')) {
      lines[i] = lines[i].replace('for (const key of analysisNutrientKeys) {', 'for (const key of evaluationNutrientKeys) {');
      break;
    }
  }
}

code = lines.join('\n');

// Also fix the try-catch block - we might have messed up the try block
// Let's just find the entire try catch block
const tryCatchMatch = code.match(/try \{\n\s+\(\{ textOutput, rawParsed \} = await callAndParseFoodAnalysis\(llmCallArgs\)\);\n\s+\}catch/g);
if (tryCatchMatch) {
  code = code.replace(/try \{\n\s+\(\{ textOutput, rawParsed \} = await callAndParseFoodAnalysis\(llmCallArgs\)\);\n\s+\}catch/g, 'try {\n      ({ textOutput, rawParsed } = await callAndParseFoodAnalysis(llmCallArgs));\n    } catch');
}

fs.writeFileSync('server.ts', code);
console.log('Fixed redeclaration and try-catch formatting in server.ts');
