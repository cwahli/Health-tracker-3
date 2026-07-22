const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/onAgentAnalysisSaved={handleAgentAnalysisSaved}/, "onAgentAnalysisSaved={handleAgentAnalysisSaved}\n            onOpenFrontDesk={() => setIsFrontDeskOpen(true)}");

fs.writeFileSync('src/App.tsx', content);
