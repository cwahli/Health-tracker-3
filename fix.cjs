const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Remove the wrongly inserted block at the top
const badBlock = `  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };
`;

code = code.replace(badBlock, '');

// Insert it into the correct location
const target = 'export default function LogChat({ ';
const componentStart = code.indexOf(target);
const braceIndex = code.indexOf('{', code.indexOf(') {', componentStart));

code = code.slice(0, braceIndex + 1) + '\\n' + badBlock + code.slice(braceIndex + 1);

fs.writeFileSync('src/components/LogChat.tsx', code);
