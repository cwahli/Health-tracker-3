const fs = require('fs');

let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Replace { ..., agentResult: ... } with { ..., data: { ...msg.data, agentResult: ... } }
// This is hard to do safely with a simple regex for all properties, so let's do it specifically.
code = code.replace(/agentResult:([\s\S]*?),/g, (match, val) => {
  if (match.includes('msg.') || match.includes('m.')) return match; // avoid recursion
  return `data: { ...((typeof msg !== 'undefined' ? msg : typeof message !== 'undefined' ? message : {}).data || {}), agentResult: ${val} },`;
});
fs.writeFileSync('src/components/LogChat.tsx', code);
