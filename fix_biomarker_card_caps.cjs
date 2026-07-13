const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/BiomarkerCard.tsx', 'utf8');

// Add import for AGENT_REGISTRY if it's missing
if (!code.includes('AGENT_REGISTRY')) {
  code = code.replace(
    "import { AgentType } from '../utils/agentConfig';",
    "import { AgentType, AGENT_REGISTRY } from '../../utils/agentConfig';"
  );
  code = code.replace(
    "import { AgentType } from '../../utils/agentConfig';",
    "import { AgentType, AGENT_REGISTRY } from '../../utils/agentConfig';"
  );
  if (!code.includes('AGENT_REGISTRY')) {
     code = code.replace(
       "import { ChatMessage, UserProfile, BiomarkerHistory } from '../../types';",
       "import { ChatMessage, UserProfile, BiomarkerHistory } from '../../types';\nimport { AGENT_REGISTRY } from '../../utils/agentConfig';"
     );
  }
}

// Replace the Title mapping block
const titleMapBlock = `                            {msg.agentType === 'agent1' && 'Clinical Data Parser'}
                            {msg.agentType === 'agent2' && 'Clinical Ontologist'}
                            {msg.agentType === 'agent3' && 'Clinical Data Coordinator'}
                            {msg.agentType === 'agent4' && 'Prognostic Diagnostics Assessment'}
                            {msg.agentType === 'agent5' && 'Personalized Reference Ranges'}
                            {msg.agentType === 'agent6' && 'Lifestyle Precision Intervention'}
                            {msg.agentType === 'agent7' && 'Medical Literature Consensus'}`;
const newTitleMap = `                            {msg.agentType && AGENT_REGISTRY[msg.agentType as AgentType]?.displayName}`;
code = code.replace(titleMapBlock, newTitleMap);

// Replace array includes with capability checks
code = code.replace(
  "{['agent1', 'agent2', 'agent3', 'agent4', 'data_review'].includes(msg.agentType || '') && msg.data?.agentResult && (currentFormat === 'table' || currentFormat === 'card') && (",
  "{msg.agentType && AGENT_REGISTRY[msg.agentType as AgentType]?.capabilities?.includes('biomarker_table_view') && msg.data?.agentResult && (currentFormat === 'table' || currentFormat === 'card') && ("
);

code = code.replace(
  "{['agent5', 'agent6', 'agent7'].includes(msg.agentType || '') && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && (",
  "{msg.agentType && AGENT_REGISTRY[msg.agentType as AgentType]?.capabilities?.includes('insight_card_view') && msg.data?.agentResult && (currentFormat === 'card' || currentFormat === 'table') && ("
);

code = code.replace(
  "{msg.data?.agentResult && msg.agentType && !['agent1', 'agent2', 'agent3', 'agent4', 'data_review'].includes(msg.agentType || '') && (",
  "{msg.data?.agentResult && msg.agentType && !AGENT_REGISTRY[msg.agentType as AgentType]?.capabilities?.includes('biomarker_table_view') && ("
);

fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', code);
