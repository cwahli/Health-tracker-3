const fs = require('fs');
let code = fs.readFileSync('src/components/InsightsTab.tsx', 'utf8');

code = code.replace(
  "import { Agent5View, Agent6View, Agent7View } from './AgentResultViews';",
  "import { GenericAgentResultView } from './AgentResultViews';"
);

code = code.replace(
  /<Agent5View rawResult=\{step\.agentResult\} \/>/g,
  "<GenericAgentResultView rawResult={step.agentResult} />"
);
code = code.replace(
  /<Agent6View rawResult=\{step\.agentResult\} \/>/g,
  "<GenericAgentResultView rawResult={step.agentResult} />"
);
code = code.replace(
  /<Agent7View rawResult=\{step\.agentResult\} \/>/g,
  "<GenericAgentResultView rawResult={step.agentResult} />"
);

code = code.replace(
  /<Agent5View rawResult=\{profile\.agentContextualizerSummary\} \/>/g,
  "<GenericAgentResultView rawResult={profile.agentContextualizerSummary} />"
);
code = code.replace(
  /<Agent6View rawResult=\{profile\.agentInterventionSummary\} \/>/g,
  "<GenericAgentResultView rawResult={profile.agentInterventionSummary} />"
);
code = code.replace(
  /<Agent7View rawResult=\{profile\.agentLiteratureSummary\} \/>/g,
  "<GenericAgentResultView rawResult={profile.agentLiteratureSummary} />"
);

fs.writeFileSync('src/components/InsightsTab.tsx', code);
