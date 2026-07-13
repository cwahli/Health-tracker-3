const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// The imports
logChat = logChat.replace("import { AgentResultTable } from './AgentResultTable';", "");
logChat = logChat.replace("import { Agent5View, Agent6View, Agent7View } from './AgentResultViews';", "");
logChat = logChat.replace("import InteractivePlacesMap from './InteractivePlacesMap';", "");
logChat = logChat.replace("import { NutrientPieChart } from './NutrientPieChart';", "");

const newImports = `import { FoodCard, FoodIdeaCard, BiomarkerCard } from './chat-cards';\n`;
// just add it after first import
logChat = logChat.replace("import React,", newImports + "import React,");

// FoodIdeaCard replacement
const foodIdeaStart = logChat.indexOf("{isAgent('food_idea') && msg.data?.pendingFoodIdeas && (");
const foodIdeaEnd = logChat.indexOf(")}", logChat.indexOf("/>", foodIdeaStart)) + 2;
logChat = logChat.substring(0, foodIdeaStart) + 
  `{msg.agentType === 'food_idea' && <FoodIdeaCard msg={msg} currentFormat={currentFormat} idx={idx} messages={messages} onLogFoodIdeas={onLogFoodIdeas} setLoggedMessageIds={setLoggedMessageIds} loggedMessageIds={loggedMessageIds} />}` + 
  logChat.substring(foodIdeaEnd);

// FoodCard & BiomarkerCard replacement
const foodStart = logChat.indexOf("{isAgent('food') && msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (");
const userMessageStart = logChat.indexOf("} else {\n              if (msg.content === 'Surprise me') return null;");

const cardsBlock = `
                  {msg.agentType === 'food' && (
                    <FoodCard
                      msg={msg}
                      currentFormat={currentFormat}
                      idx={idx}
                      messages={messages}
                      report={report}
                      foodLogs={foodLogs}
                      t={t}
                      formatNutrientValue={formatNutrientValue}
                      onLogFood={onLogFood}
                      setLoggedMessageIds={setLoggedMessageIds}
                      loggedMessageIds={loggedMessageIds}
                      profile={profile}
                    />
                  )}
                  {['agent1', 'agent2', 'agent3', 'agent4', 'agent5', 'agent6', 'agent7', 'data_review', 'medical', 'medical_extract'].includes(msg.agentType || '') && (
                    <BiomarkerCard
                      msg={msg}
                      currentFormat={currentFormat}
                      idx={idx}
                      messages={messages}
                      profile={profile}
                      biomarkerHistory={biomarkerHistory}
                      handleAgent1Step={handleAgent1Step}
                      handleContinueExtractionChunk={handleContinueExtractionChunk}
                      setLoggedMessageIds={setLoggedMessageIds}
                      loggedMessageIds={loggedMessageIds}
                      onAgentFinish={onAgentFinish}
                      handleSend={handleSend}
                      setActiveInstructionAgentType={setActiveInstructionAgentType}
                      setActiveInstructionPrompt={setActiveInstructionPrompt}
                      onLogMedical={onLogMedical}
                    />
                  )}
                  `;

logChat = logChat.substring(0, foodStart) + cardsBlock + logChat.substring(userMessageStart);

fs.writeFileSync('src/components/LogChat.tsx', logChat);
