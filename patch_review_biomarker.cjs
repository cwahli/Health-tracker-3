const fs = require('fs');
let code = fs.readFileSync('src/components/ReviewBiomarkerModal.tsx', 'utf8');

if (!code.includes('import { trackApiCall }')) {
  code = "import { trackApiCall } from '../utils/apiTracker';\n" + code;
}

code = code.replace(
  /const res = await fetch\('\/api\/gemini\/review-biomarker', \{/g,
  `trackApiCall('gemini', \`Review Biomarker\`);\n      const res = await fetch('/api/gemini/review-biomarker', {`
);

fs.writeFileSync('src/components/ReviewBiomarkerModal.tsx', code);
