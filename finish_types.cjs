const fs = require('fs');

let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(/  pendingFoodLog\?: Partial<FoodLog>;/, '');
code = code.replace(/  pendingFoodIdeas\?: FoodIdea\[\];/, '');
code = code.replace(/  pendingBiomarkers\?: \{ \[key: string\]: number \| string \};/, '');
code = code.replace(/  pendingBiomarkerEntries\?: \{ date: string \| null; biomarkers: \{ \[key: string\]: number \| string \} \}\[\];/, '');
code = code.replace(/  pendingCustomBiomarkerDefs\?: \{\s*\[key: string\]: \{\s*name: string;\s*unit: string;\s*normalRange: string;\s*description: string;\s*\}\s*\};/m, '');
code = code.replace(/  proposal\?: \{\s*name: string;\s*metric: string;\s*value: string \| number;\s*range: string;\s*description: string;\s*benefitRisk: string;\s*isDuplicate\?: boolean;\s*duplicateExplanation\?: string;\s*duplicateSuggestedKeys\?: string\[\];\s*\};/m, '');
code = code.replace(/  bucketMapping\?: any;/, '');
code = code.replace(/  agentResult\?: any;/, '');
fs.writeFileSync('src/types.ts', code);
