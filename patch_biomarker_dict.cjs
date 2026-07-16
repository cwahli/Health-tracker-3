const fs = require('fs');
let code = fs.readFileSync('src/components/BiomarkerDictionaryModal.tsx', 'utf8');

if (!code.includes('import { trackApiCall }')) {
  code = "import { trackApiCall } from '../utils/apiTracker';\n" + code;
}

code = code.replace(
  /const res = await fetch\('\/api\/gemini\/route-chat', \{/g,
  `trackApiCall('gemini', \`Route Chat\`);\n      const res = await fetch('/api/gemini/route-chat', {`
);

code = code.replace(
  /const response = await fetch\('\/api\/gemini\/data-accuracy', \{/g,
  `trackApiCall('gemini', \`Data Accuracy\`);\n      const response = await fetch('/api/gemini/data-accuracy', {`
);

code = code.replace(
  /const res = await fetch\('\/api\/gemini\/consolidate-names', \{/g,
  `trackApiCall('gemini', \`Consolidate Names\`);\n      const res = await fetch('/api/gemini/consolidate-names', {`
);

code = code.replace(
  /const res = await fetch\(endpoint, \{/g,
  `trackApiCall('gemini', \`\${endpoint}\`);\n      const res = await fetch(endpoint, {`
);

fs.writeFileSync('src/components/BiomarkerDictionaryModal.tsx', code);
