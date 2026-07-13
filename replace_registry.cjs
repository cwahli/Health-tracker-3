const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Replace the imports to include agentCardRegistry
logChat = logChat.replace("import { FoodCard, FoodIdeaCard, BiomarkerCard } from './chat-cards';", "import { agentCardRegistry } from './chat-cards';");

const oldBlock = `                  {msg.agentType === 'food_idea' && <FoodIdeaCard msg={msg} currentFormat={currentFormat} idx={idx} messages={messages} onLogFoodIdeas={onLogFoodIdeas} setLoggedMessageIds={setLoggedMessageIds} loggedMessageIds={loggedMessageIds} />}
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
                  )}`;

const newBlock = `                  {(() => {
                    const Renderer = msg.agentType ? agentCardRegistry[msg.agentType] : null;
                    if (!Renderer) return null;
                    return (
                      <Renderer
                        msg={msg}
                        currentFormat={currentFormat}
                        idx={idx}
                        messages={messages}
                        report={report}
                        foodLogs={foodLogs}
                        t={t}
                        formatNutrientValue={formatNutrientValue}
                        onLogFood={onLogFood}
                        onLogFoodIdeas={onLogFoodIdeas}
                        setLoggedMessageIds={setLoggedMessageIds}
                        loggedMessageIds={loggedMessageIds}
                        profile={profile}
                        biomarkerHistory={biomarkerHistory}
                        handleAgent1Step={handleAgent1Step}
                        handleContinueExtractionChunk={handleContinueExtractionChunk}
                        onAgentFinish={onAgentFinish}
                        handleSend={handleSend}
                        setActiveInstructionAgentType={setActiveInstructionAgentType}
                        setActiveInstructionPrompt={setActiveInstructionPrompt}
                        onLogMedical={onLogMedical}
                      />
                    );
                  })()}`;

logChat = logChat.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/LogChat.tsx', logChat);
