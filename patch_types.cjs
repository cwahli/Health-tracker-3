const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// The instruction:
// In src/types.ts, collapse the agent-specific optional fields on ChatMessage (pendingFoodLog, pendingFoodIdeas, pendingBiomarkers, pendingBiomarkerEntries, pendingCustomBiomarkerDefs, proposal, bucketMapping, agentResult) into either a single generic data?: Record<string, unknown> field, or a discriminated union keyed by agentType/type. Update all read/write sites in LogChat.tsx and server.ts accordingly.
// Do not: change the actual data being stored.

// I will make it `data?: Record<string, unknown>;`
// And I will add `// Legacy fields for migration` but keep them in the interface as optional, OR actually replace them completely?
// If I replace them completely, then I'll use `Record<string, unknown>` and fix TS errors.
// Wait, the instruction explicitly says "collapse ... into either a single generic data?: Record<string, unknown> field, or a discriminated union".
// Let's use `data?: Record<string, unknown>;` and completely remove the top-level fields from the type.
// But wait, the instruction also says "Do not: change the actual data being stored... Firestore documents already written with the old shape must still read correctly (add a migration/fallback read path if needed rather than assuming all historical data matches the new shape)."
// So they will be read from Firestore in the old shape, but the TS type `ChatMessage` shouldn't have them anymore. We will map them in `LogChat.tsx`.

code = code.replace(/  pendingFoodLog\?: Partial<FoodLog>;/, '');
code = code.replace(/  pendingFoodIdeas\?: FoodIdea\[\];/, '');
code = code.replace(/  pendingBiomarkers\?: \{ \[key: string\]: number \| string \};/, '');
code = code.replace(/  pendingBiomarkerEntries\?: \{ date: string \| null; biomarkers: \{ \[key: string\]: number \| string \} \}\[\];/, '');
code = code.replace(/  pendingCustomBiomarkerDefs\?: \{[\s\S]*?  \};/, '');
code = code.replace(/  proposal\?: \{[\s\S]*?  \};/, '');
code = code.replace(/  bucketMapping\?: any;/, '');
code = code.replace(/  agentResult\?: any;/, '');

code = code.replace(/  isError\?: boolean;/, "  isError?: boolean;\n  data?: Record<string, any>; // collapsed agent-specific fields");

fs.writeFileSync('src/types.ts', code);
