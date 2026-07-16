const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  `const singleLineLog = sanitizedMsg.replace(/\\n/g, '\\n');
  if (singleLineLog.length > 300) {
    console.log(\`[LLM DEBUG \${timestamp}]: \${singleLineLog.substring(0, 300)}... [Truncated \${singleLineLog.length - 300} chars. Full detailed payload is saved in session memory and visible via the Full-Screen Diagnostic Log Viewer UI]\`);
  } else {
    console.log(\`[LLM DEBUG \${timestamp}]: \${singleLineLog}\`);
  }`,
  `const singleLineLog = sanitizedMsg.replace(/\\n/g, '\\n');
  if (singleLineLog.length > 4000) {
    console.log(\`[LLM DEBUG \${timestamp}]: \${singleLineLog.substring(0, 4000)}... [Truncated \${singleLineLog.length - 4000} chars.]\`);
  } else {
    console.log(\`[LLM DEBUG \${timestamp}]: \${singleLineLog}\`);
  }`
);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts logs");
