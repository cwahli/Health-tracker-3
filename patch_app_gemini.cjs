const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('trackApiCall(\'gemini\', `Insight Analyze')) {
  code = code.replace(
    /const response = await fetch\('\/api\/gemini\/insight-analyze', \{/,
    `trackApiCall('gemini', \`Insight Analyze\`, auth.currentUser?.email || 'anonymous');\n      const response = await fetch('/api/gemini/insight-analyze', {`
  );
}

fs.writeFileSync('src/App.tsx', code);
