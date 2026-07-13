const fs = require('fs');

let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

code = code.replace(/msg\.data\?\.agentResult\.unselectedRowKeys = filteredKeys;/g, 'if (msg.data && msg.data.agentResult) msg.data.agentResult.unselectedRowKeys = filteredKeys;');
code = code.replace(/\{val\} \{String\(val\)\.includes\(unit\) \? '' : unit\}/g, '{String(val)} {String(val).includes(unit) ? "" : unit}');

fs.writeFileSync('src/components/LogChat.tsx', code);
