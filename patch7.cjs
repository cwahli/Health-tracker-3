const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Insert isUnified and activeAgentConfig
const topInsertionPoint = code.indexOf('const [conversationsList');
code = code.slice(0, topInsertionPoint) + 
`  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig.id === targetType;
    return type === targetType;
  };
` + code.slice(topInsertionPoint);

fs.writeFileSync('src/components/LogChat.tsx', code);
