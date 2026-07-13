const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// 1. Line 555-559
code = code.replace(
  "messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');",
  "messages.map(m => `[${m.role.toUpperCase()}]\\n${m.content}`).join('\\n\\n---\\n\\n');"
);

// 2. Line 1635-1637
code = code.replace(
  "messages.slice(0, msgIndex).filter(m => m.role === 'user').map(m => m.content).join('\n\n');",
  "messages.slice(0, msgIndex).filter(m => m.role === 'user').map(m => m.content).join('\\n\\n');"
);

// 3. Line 2156-2163
code = code.replace(
  "messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');\n                          if (isAgent('medical')) {\n                            logTxt = `=== PAYLOAD ===\n` + logTxt;",
  "messages.map(m => `[${m.role.toUpperCase()}]\\n${m.content}`).join('\\n\\n---\\n\\n');\n                          if (isAgent('medical')) {\n                            logTxt = `=== PAYLOAD ===\\n` + logTxt;"
);

// 4. Line 2186-2200
code = code.replace(
  "messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');\n                        let logTxt = lastSentPayload ? `=== PAYLOAD ===\n${JSON.stringify(lastSentPayload, null, 2)}\n\n=== CONVERSATION ===\n${msgLog}` : msgLog;\n                        if (isAgent('medical')) {\n                          logTxt += `\n\n[Medical Profile]\n${JSON.stringify(profile, null, 2)}`;",
  "messages.map(m => `[${m.role.toUpperCase()}]\\n${m.content}`).join('\\n\\n---\\n\\n');\n                        let logTxt = lastSentPayload ? `=== PAYLOAD ===\\n${JSON.stringify(lastSentPayload, null, 2)}\\n\\n=== CONVERSATION ===\\n${msgLog}` : msgLog;\n                        if (isAgent('medical')) {\n                          logTxt += `\\n\\n[Medical Profile]\\n${JSON.stringify(profile, null, 2)}`;"
);

// 5. Line 3145-3169
code = code.replace(
  "{String(msg.content).includes('Here is the suggestion:\n\n') ? (\n                        <div className=\"whitespace-pre-line break-words text-sm\">\n                          {String(msg.content).split('Here is the suggestion:\n\n')[0]}\n                          Here is the suggestion:\n                          <div className=\"mt-2 mb-2 p-2 bg-indigo-700/30 rounded border border-indigo-400/30 font-mono text-xs overflow-hidden h-10 relative cursor-pointer\"\n                               onClick={() => {\n                                  const jsonStr = String(msg.content).split('Here is the suggestion:\n\n')[1].split('\n\nCould you please')[0];\n                                  setFullScreenJson(jsonStr);\n                               }}\n                          >\n                            <span className=\"text-indigo-200 hover:text-white underline\">(previous review)</span>\n                          </div>\n                          {String(msg.content).split('\n\nCould you please')[1] ? 'Could you please' + String(msg.content).split('\n\nCould you please')[1] : ''}",
  "{String(msg.content).includes('Here is the suggestion:\\n\\n') ? (\n                        <div className=\"whitespace-pre-line break-words text-sm\">\n                          {String(msg.content).split('Here is the suggestion:\\n\\n')[0]}\n                          Here is the suggestion:\n                          <div className=\"mt-2 mb-2 p-2 bg-indigo-700/30 rounded border border-indigo-400/30 font-mono text-xs overflow-hidden h-10 relative cursor-pointer\"\n                               onClick={() => {\n                                  const jsonStr = String(msg.content).split('Here is the suggestion:\\n\\n')[1].split('\\n\\nCould you please')[0];\n                                  setFullScreenJson(jsonStr);\n                               }}\n                          >\n                            <span className=\"text-indigo-200 hover:text-white underline\">(previous review)</span>\n                          </div>\n                          {String(msg.content).split('\\n\\nCould you please')[1] ? 'Could you please' + String(msg.content).split('\\n\\nCould you please')[1] : ''}"
);

fs.writeFileSync('src/components/LogChat.tsx', code);
