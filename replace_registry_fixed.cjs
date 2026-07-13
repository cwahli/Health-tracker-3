const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const startIdx = logChat.indexOf("{msg.agentType === 'food_idea' && <FoodIdeaCard");
const endIdxStr = "</BiomarkerCard>\n                  )}";
const endIdx = logChat.indexOf(endIdxStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newBlock = `{(() => {
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
  logChat = logChat.substring(0, startIdx) + newBlock + logChat.substring(endIdx + endIdxStr.length);
  fs.writeFileSync('src/components/LogChat.tsx', logChat);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start or end block.");
  console.log("startIdx:", startIdx, "endIdx:", endIdx);
}
