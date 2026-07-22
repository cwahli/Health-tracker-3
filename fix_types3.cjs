const fs = require('fs');
let currentTypes = fs.readFileSync('src/types.ts', 'utf8');
currentTypes = currentTypes.replace(/id\?: string;\n  timestamp\?: string;\n  agentId\?: string;\n  summary\?: string;\n}/, 'id?: string;\n  timestamp?: string;\n  agentId?: string;\n  summary?: string;\n  date?: string;\n  result?: any;\n  archived?: boolean;\n  agentType?: string;\n}');
currentTypes = currentTypes.replace(/conditions\?: any\[\];\n  brackets\?: any\[\];\n}/, 'conditions?: any[];\n  brackets?: any[];\n  filters?: any[];\n  range?: any;\n}');
fs.writeFileSync('src/types.ts', currentTypes);
console.log("Fixed types 3");
