const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/BiomarkerCard.tsx', 'utf8');

code = code.replace(
  "import { Agent5View, Agent6View, Agent7View } from '../AgentResultViews';",
  "import { GenericAgentResultView } from '../AgentResultViews';"
);

const oldAgent567 = `                      {msg.agentType === 'agent5' && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && (
                        <div className="space-y-2">
                          <Agent5View rawResult={msg.data?.agentResult} />
                        </div>
                      )}

                      {msg.agentType === 'agent6' && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && (
                        <div className="space-y-2">
                          <Agent6View rawResult={msg.data?.agentResult} />
                        </div>
                      )}

                      {msg.agentType === 'agent7' && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && (
                        <div className="space-y-2">
                          <Agent7View rawResult={msg.data?.agentResult} />
                        </div>
                      )}`;

const newAgent567 = `                      {['agent5', 'agent6', 'agent7'].includes(msg.agentType || '') && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && (
                        <div className="space-y-2">
                          <GenericAgentResultView rawResult={msg.data?.agentResult} />
                        </div>
                      )}`;

code = code.replace(oldAgent567, newAgent567);
fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', code);
