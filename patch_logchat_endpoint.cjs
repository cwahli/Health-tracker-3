const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

content = content.replace(/else if \(isAgent\('health_baseline'\)\) endpoint = '\/api\/gemini\/health-baseline-analyze';/, "else if (isAgent('health_baseline')) endpoint = '/api/gemini/health-baseline-analyze';\n      else if (isAgent('front_desk')) endpoint = '/api/gemini/front-desk';");

fs.writeFileSync('src/components/LogChat.tsx', content);
