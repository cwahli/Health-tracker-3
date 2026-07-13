const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Remove both blocks
const badBlock1 = `  const activeAgentKey = (isAgent('medical') && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };`;
const badBlock2 = `  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };`;

// Also there might be indentation differences, so let's just use regex or match lines
code = code.replace(/  const activeAgentKey[\s\S]*?return type === targetType;\n  \};\n/g, '');

const correctBlock = `
  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };
`;

const target = 'export default function LogChat({ ';
const componentStart = code.indexOf(target);
const braceIndex = code.indexOf('{', code.indexOf(') {', componentStart));

code = code.slice(0, braceIndex + 1) + correctBlock + code.slice(braceIndex + 1);

fs.writeFileSync('src/components/LogChat.tsx', code);
