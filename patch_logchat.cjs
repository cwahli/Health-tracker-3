const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

if (!code.includes('import { trackApiCall')) {
  code = code.replace(/import React/, "import { trackApiCall, setActiveQueryId, generateQueryId } from '../utils/apiTracker';\nimport React");
}

if (!code.includes('generateQueryId()')) {
  code = code.replace(
    /useEffect\(\(\) => \{\n    if \(isOpen\) \{\n      loadConversationsFromFirestore\(\);\n    \}\n  \}, \[auth.currentUser, type, agentType, isOpen\]\);/,
    `useEffect(() => {
    if (isOpen) {
      const qid = generateQueryId();
      setActiveQueryId(qid);
      loadConversationsFromFirestore();
    } else {
      setActiveQueryId(null);
    }
  }, [auth.currentUser, type, agentType, isOpen]);`
  );
}

if (!code.includes('trackApiCall(\'gemini\', `Medical Analyze')) {
  code = code.replace(
    /const response = await fetch\('\/api\/gemini\/medical-analyze'/g,
    `trackApiCall('gemini', \`Medical Analyze - \${agentType}\`);\n      const response = await fetch('/api/gemini/medical-analyze'`
  );
}

if (!code.includes('trackApiCall(\'gemini\', `Food Image Search')) {
  code = code.replace(
    /const response = await fetch\("\/api\/gemini\/food-image-search"/g,
    `trackApiCall('gemini', \`Food Image Search - \${agentType}\`);\n      const response = await fetch("/api/gemini/food-image-search"`
  );
}

if (!code.includes('trackApiCall(\'gemini\', `Chat -')) {
  code = code.replace(
    /const response = await fetch\("\/api\/gemini\/chat", \{/g,
    `trackApiCall('gemini', \`Chat - \${agentType}\`);\n      const response = await fetch("/api/gemini/chat", {`
  );
}

fs.writeFileSync('src/components/LogChat.tsx', code);
