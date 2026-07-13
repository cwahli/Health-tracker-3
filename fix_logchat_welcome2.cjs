const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const sIdx1 = code.indexOf("content: isUnified && activeAgentConfig?.welcomeMessage");
const eIdx1 = code.indexOf("timestamp: new Date().toISOString()", sIdx1);
if (sIdx1 !== -1 && eIdx1 !== -1) {
  const newBlock1 = `content: activeAgentConfig?.welcomeMessage
        ? (typeof activeAgentConfig.welcomeMessage === 'function' ? activeAgentConfig.welcomeMessage({ dataReviewBatchIdx }) : activeAgentConfig.welcomeMessage)
        : 'Hello! How can I help you today?',
      `;
  code = code.substring(0, sIdx1) + newBlock1 + code.substring(eIdx1);
}

const sIdx2 = code.indexOf("{isUnified && activeAgentConfig");
const eIdx2 = code.indexOf("</h2>", sIdx2);
if (sIdx2 !== -1 && eIdx2 !== -1) {
  const newBlock2 = `{activeAgentKey === 'data_review' ? \`\${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)}\` : (activeAgentConfig?.displayName || t.addMedical)}
              `;
  code = code.substring(0, sIdx2) + newBlock2 + code.substring(eIdx2);
}

fs.writeFileSync('src/components/LogChat.tsx', code);
