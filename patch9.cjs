const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// The `isAgent` declaration needs to be hoisted above where it is used.
// It is used inside `getWelcomeMessage`, which is defined around line 586.
// `getWelcomeMessage` itself is used in `useState`? Wait.
// Let's just put the helpers at the very beginning of the component.
const startOfComponent = code.indexOf('export const LogChat');
const braceIndex = code.indexOf('{', startOfComponent) + 1;

// First let's remove the helpers I injected earlier:
code = code.replace(/  const activeAgentKey = \(type === 'medical' && agentType\) \? \(agentType as AgentType\) : \(type as AgentType\);\n  const activeAgentConfig = AGENT_REGISTRY\[activeAgentKey\] \|\| AGENT_REGISTRY\[type as AgentType\];\n  const isUnified = \['food', 'medical', 'food_idea', 'daily_recommendation'\].includes\(type\) && getAgentRolloutStatus\(type as AgentType\) === 'unified';\n\n  const isAgent = \(targetType: AgentType\) => \{\n    if \(isUnified\) return activeAgentConfig\.id === targetType;\n    return type === targetType;\n  \};\n/, '');

const newHelpers = `
  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };
`;

code = code.slice(0, braceIndex) + newHelpers + code.slice(braceIndex);

fs.writeFileSync('src/components/LogChat.tsx', code);
