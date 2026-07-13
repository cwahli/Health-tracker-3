const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/BiomarkerCard.tsx', 'utf8');
code = code.replace("                </div>\n              );", "");
// let's replace all occurrences of `loggedMessageIds.includes` with `loggedMessageIds?.includes`
code = code.replace(/loggedMessageIds\.includes/g, "(loggedMessageIds || []).includes");
// also fix `setLoggedMessageIds`
code = code.replace(/setLoggedMessageIds\(/g, "setLoggedMessageIds?.(");
// wait, BiomarkerCard uses `onLogMedical` but we didn't add it to props!
// we need to add `onLogMedical?: any` to `AgentCardProps`
fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', code);

let types = fs.readFileSync('src/components/chat-cards/types.ts', 'utf8');
types = types.replace("onLogFoodIdeas?: (ideas: any[]) => void;", "onLogFoodIdeas?: (ideas: any[]) => void;\n  onLogMedical?: any;");
fs.writeFileSync('src/components/chat-cards/types.ts', types);
