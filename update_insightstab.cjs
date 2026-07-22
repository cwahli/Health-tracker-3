const fs = require('fs');
let content = fs.readFileSync('src/components/InsightsTab.tsx', 'utf-8');

content = content.replace(/onAgentAnalysisSaved\?: \(analysis: any\) => void;/, "onAgentAnalysisSaved?: (analysis: any) => void;\n  onOpenFrontDesk?: () => void;");
content = content.replace(/onAgentAnalysisSaved\n\}: InsightsTabProps\)/, "onAgentAnalysisSaved,\n  onOpenFrontDesk\n}: InsightsTabProps)");

fs.writeFileSync('src/components/InsightsTab.tsx', content);
