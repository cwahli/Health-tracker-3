const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { trackApiCall')) {
  code = code.replace(/import \{ doc, getDoc/, "import { trackApiCall, setActiveQueryId, generateQueryId } from './utils/apiTracker';\nimport { doc, getDoc");
}

if (!code.includes('trackApiCall(apiType')) {
  code = code.replace(
    /const logInteraction = \(type: 'upload' \| 'download' \| 'delete' \| 'sync', path: string, data: any, docCount: number = 1\) => \{/,
    `const logInteraction = (type: 'upload' | 'download' | 'delete' | 'sync', path: string, data: any, docCount: number = 1) => {
    if (type === 'upload' || type === 'delete' || type === 'download') {
      const apiType = type === 'upload' ? 'firebase_write' : type === 'delete' ? 'firebase_delete' : 'firebase_read';
      const userEmail = auth.currentUser?.email || 'anonymous';
      trackApiCall(apiType, \`Firebase \${type} - \${path}\`, userEmail);
    }`
  );
}

if (!code.includes('trackApiCall(\'firebase_write\', `Firebase upload - Auto-compress`')) {
  code = code.replace(
    /setDoc\(doc\(db, 'users', uid, 'foodImages', up.id\), sanitizeForFirestore\(\{/,
    `trackApiCall('firebase_write', \`Firebase upload - Auto-compress \${up.id}\`, auth.currentUser?.email || 'anonymous');\n                    setDoc(doc(db, 'users', uid, 'foodImages', up.id), sanitizeForFirestore({`
  );
}

fs.writeFileSync('src/App.tsx', code);
