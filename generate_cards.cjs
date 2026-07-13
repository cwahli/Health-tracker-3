const fs = require('fs');

let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// 1. FoodCard (starts at food eval card, ends after pending food log)
const foodStart = logChat.indexOf("{isAgent('food') && msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (");
const foodEndStr = "</div>\n                  )}";
// We find the index of the first `isAgent('medical')` block which is right after the `food` and `agentResult` blocks
const biomarkerStart = logChat.indexOf("{/* Render Agent Result Blocks */}");
const foodCode = logChat.substring(foodStart, biomarkerStart).trim();

// 2. BiomarkerCard
const userMessageStart = logChat.indexOf("} else {\n              if (msg.content === 'Surprise me') return null;");
const biomarkerCode = logChat.substring(biomarkerStart, userMessageStart).trim();

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', `import React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, Sparkles } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import NutrientPieChart from '../NutrientPieChart';
import { ALL_NUTRIENTS } from '../../utils/nutrients';
import { FoodLog } from '../../types';

export const FoodCard: React.FC<AgentCardProps> = ({
  msg, currentFormat, report, foodLogs, t, formatNutrientValue,
  onLogFood, setLoggedMessageIds, loggedMessageIds
}) => {
  if (msg.agentType !== 'food') return null;
  return (
    <>
      ${foodCode.replace(/isAgent\('food'\) && /g, '')}
    </>
  );
};
`);

fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', `import React from 'react';
import { AgentCardProps } from './types';
import { Sparkles, Check, Plus } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import AgentResultTable from '../AgentResultTable';
import { Agent5View, Agent6View, Agent7View } from '../AgentResultViews';

export const BiomarkerCard: React.FC<AgentCardProps> = ({
  msg, currentFormat, messages, idx, profile, biomarkerHistory,
  handleAgent1Step, handleContinueExtractionChunk, setLoggedMessageIds,
  loggedMessageIds, onAgentFinish, handleSend, setActiveInstructionAgentType,
  setActiveInstructionPrompt
}) => {
  // We assume msg.agentType starts with 'agent' or is 'data_review' or 'medical'
  return (
    <>
      ${biomarkerCode.replace(/isAgent\('medical'\)/g, "msg.agentType === 'medical'")}
    </>
  );
};
`);

