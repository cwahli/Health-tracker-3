const fs = require('fs');

let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// 1. FoodCard (starts at food eval card, ends after pending food log)
const foodStart = logChat.indexOf("{isAgent('food') && msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (");
const biomarkerStart = logChat.indexOf("{/* Render Agent Result Blocks */}");
const foodCode = logChat.substring(foodStart, biomarkerStart).trim();

// 2. BiomarkerCard
const userMessageStart = logChat.indexOf("} else {\n              if (msg.content === 'Surprise me') return null;");
let biomarkerCode = logChat.substring(biomarkerStart, userMessageStart).trim();
biomarkerCode = biomarkerCode.replace("                </div>\n              );", "");
biomarkerCode = biomarkerCode.replace(/loggedMessageIds\.includes/g, "(loggedMessageIds || []).includes");
biomarkerCode = biomarkerCode.replace(/setLoggedMessageIds\(/g, "setLoggedMessageIds?.(");

let foodCodeClean = foodCode.replace(/isAgent\('food'\) && /g, '');
foodCodeClean = foodCodeClean.replace(/loggedMessageIds\.includes/g, "(loggedMessageIds || []).includes");
foodCodeClean = foodCodeClean.replace(/setLoggedMessageIds\(/g, "setLoggedMessageIds?.(");


fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', `import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import { NutrientPieChart } from '../NutrientPieChart';
import { ALL_NUTRIENTS } from '../../constants/nutrients';
import { nutrientDefinitions } from '../../utils/nutrition';
import { FoodLog } from '../../types';

export const FoodCard: React.FC<AgentCardProps> = ({
  msg, currentFormat, report, foodLogs, t, formatNutrientValue,
  onLogFood, setLoggedMessageIds, loggedMessageIds, profile
}) => {
  const [expandedTables, setExpandedTables] = React.useState<Record<string, boolean>>({});
  if (msg.agentType !== 'food') return null;
  return (
    <>
      ${foodCodeClean}
    </>
  );
};
`);

fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', `import * as React from 'react';
import { AgentCardProps } from './types';
import { Sparkles, Check, Plus } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { AgentResultTable } from '../AgentResultTable';
import { Agent5View, Agent6View, Agent7View } from '../AgentResultViews';
import { biomarkerDefinitions } from '../../utils/biomarkers';

export const BiomarkerCard: React.FC<AgentCardProps> = ({
  msg, currentFormat, messages, idx, profile, biomarkerHistory,
  handleAgent1Step, handleContinueExtractionChunk, setLoggedMessageIds,
  loggedMessageIds, onAgentFinish, handleSend, setActiveInstructionAgentType,
  setActiveInstructionPrompt, onLogMedical
}) => {
  // We assume msg.agentType starts with 'agent' or is 'data_review' or 'medical'
  return (
    <>
      ${biomarkerCode.replace(/isAgent\('medical'\)/g, "msg.agentType === 'medical'")}
    </>
  );
};
`);

// 3. FoodIdeaCard
const foodIdeaStart = logChat.indexOf("{isAgent('food_idea') && msg.data?.pendingFoodIdeas && (");
const foodIdeaEnd = logChat.indexOf(")}", logChat.indexOf("/>", foodIdeaStart)) + 2;
let foodIdeaCode = logChat.substring(foodIdeaStart, foodIdeaEnd);
foodIdeaCode = foodIdeaCode.replace(/isAgent\('food_idea'\) && /g, '');
foodIdeaCode = foodIdeaCode.replace(/loggedMessageIds\.includes/g, "(loggedMessageIds || []).includes");
foodIdeaCode = foodIdeaCode.replace(/setLoggedMessageIds\(/g, "setLoggedMessageIds?.(");

fs.writeFileSync('src/components/chat-cards/FoodIdeaCard.tsx', `import * as React from 'react';
import { AgentCardProps } from './types';
import { InteractivePlacesMap } from '../InteractivePlacesMap';

export const FoodIdeaCard: React.FC<AgentCardProps> = ({
  msg,
  onLogFoodIdeas,
  setLoggedMessageIds,
  loggedMessageIds
}) => {
  if (msg.agentType !== 'food_idea') return null;

  return (
    <>
      ${foodIdeaCode}
    </>
  );
};
`);
