const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const welcomeBlockOld = `      content: isUnified && activeAgentConfig?.welcomeMessage
        ? (typeof activeAgentConfig.welcomeMessage === 'function' ? activeAgentConfig.welcomeMessage({ dataReviewBatchIdx }) : activeAgentConfig.welcomeMessage)
        : isAgent('food_idea')
          ? 'Hello! Do you have any specific food preferences or cravings today? I will need your location to find the best dining options matching your biomarker goals.'
          : isAgent('daily_recommendation')
            ? 'Hello! I am your AI Health Coach. Let me look at your clinical biomarkers, daily steps, and latest dietary intake to give you a customized, comprehensive health recommendation today.'
            : agentType === 'agent1'
            ? 'Hello! I am the Clinical Data Parser. I extract biomarkers and readings from raw text or reports into a structured format.'
            : agentType === 'agent2'
              ? 'Hello! I am the Clinical Ontologist. I map extracted biomarkers to clinical conditions and physiological risk categories.'
              : agentType === 'agent3'
                ? 'Hello! I am the Clinical Data Coordinator. I assemble mapped data into clean physiological buckets.'
                : agentType === 'agent4'
                  ? 'Hello! I am the Prognostic Diagnostics Assessment agent. I analyze your biomarker history to project timeline risks and identify testing gaps.'
                  : agentType === 'agent5'
                    ? 'Hello! I am the Personalized Reference Ranges agent. I calibrate normal biomarker reference ranges to your exact demographics.'
                    : agentType === 'agent6'
                      ? 'Hello! I am the Lifestyle Precision Intervention agent. I translate diagnostic risk into strict dietary and movement targets.'
                      : agentType === 'agent7'
                        ? 'Hello! I am the Medical Literature Consensus agent. I scan PubMed and clinical trials to bring recent scientific debate to your context.'
                        : agentType === 'data_review'
                          ? \`Hello! I am your Clinical Calibration Agent. Here is what is about to happen: I will analyze \${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)} containing your raw biomarker readings. I will automatically recognize your demographic parameters (age, gender, ethnicity) and calibrate all reference ranges precisely to your profile. I will then map each biomarker to its standard physiological grouping, potential medical conditions, and break down each medical range clinically (such as Borderline High or Optimal zones) with clear, actionable insights—all without repeating boilerplate demographic lines. Let's start the calibration!\`
                          : 'Hello! I can help you parse blood report photos, medical test charts, or manual body logs to build a comprehensive profile of your biomarkers. What information would you like to enter today?',`;

const welcomeBlockNew = `      content: activeAgentConfig?.welcomeMessage
        ? (typeof activeAgentConfig.welcomeMessage === 'function' ? activeAgentConfig.welcomeMessage({ dataReviewBatchIdx }) : activeAgentConfig.welcomeMessage)
        : 'Hello! How can I help you today?',`;

code = code.replace(welcomeBlockOld, welcomeBlockNew);

const titleBlockOld = `                  {isUnified && activeAgentConfig
                  ? (activeAgentKey === 'data_review' ? \`\${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)}\` : activeAgentConfig.displayName)
                  : isAgent('food') 
                  ? t.addFood 
                  : isAgent('food_idea') 
                    ? 'Food ideas' 
                    : agentType === 'agent1' 
                      ? 'Clinical Data Parser' 
                      : agentType === 'agent2' 
                        ? 'Clinical Ontologist' 
                        : agentType === 'agent3' 
                          ? 'Clinical Data Coordinator' 
                          : agentType === 'agent4' 
                            ? 'Prognostic Diagnostics Assessment' 
                            : agentType === 'agent5' 
                              ? 'Personalized Reference Ranges' 
                              : agentType === 'agent6' 
                                ? 'Lifestyle Precision Intervention' 
                                : agentType === 'agent7' 
                                  ? 'Medical Literature Consensus' 
                                  : agentType === 'data_review'
                                    ? \`\${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)}\`
                                    : t.addMedical}`;

const titleBlockNew = `                  {activeAgentKey === 'data_review' ? \`\${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)}\` : (activeAgentConfig?.displayName || t.addMedical)}`;

code = code.replace(titleBlockOld, titleBlockNew);

fs.writeFileSync('src/components/LogChat.tsx', code);
