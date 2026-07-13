const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace("  isError?: boolean;\n  data?: Record<string, any>; // collapsed agent-specific fields", 
`  isError?: boolean;
  data?: Record<string, any>;
  pendingFoodLog?: Partial<FoodLog>;
  pendingFoodIdeas?: FoodIdea[];
  pendingBiomarkers?: { [key: string]: number | string };
  pendingBiomarkerEntries?: { date: string | null; biomarkers: { [key: string]: number | string } }[];
  pendingCustomBiomarkerDefs?: {
    [key: string]: {
      name: string;
      unit: string;
      normalRange: string;
      description: string;
    }
  };
  proposal?: {
    name: string;
    metric: string;
    value: string | number;
    range: string;
    description: string;
    benefitRisk: string;
    isDuplicate?: boolean;
    duplicateExplanation?: string;
    duplicateSuggestedKeys?: string[];
  };
  bucketMapping?: any;
  agentResult?: any;
`);
fs.writeFileSync('src/types.ts', code);
