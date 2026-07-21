import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/components/LogChat.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const targetString = 'const scoutMatch = accumulatedByStage.scout.match(/\\"scoutScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/) || accumulatedText.match(/\\"scoutScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/); const dietMatch = accumulatedByStage.dietitian.match(/\\"dietitianScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/) || accumulatedText.match(/\\"dietitianScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/);';

const replacementString = 'const scoutMatch = accumulatedByStage.scout.match(/"scratchpad"\\s*:\\s*"([^]*?)("|$)/); const dietMatch = accumulatedByStage.dietitian.match(/"scratchpad"\\s*:\\s*"([^]*?)("|$)/);';

// Replace all occurrences
content = content.split(targetString).join(replacementString);

fs.writeFileSync(filePath, content);
console.log("File updated successfully");
