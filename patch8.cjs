const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

// Replace all occurrences of type === 'food' with isAgent('food') etc.
// But we must NOT replace the ones we just added in the helper!
// The helper uses `type === targetType`.
// Let's replace only occurrences outside the helper.

// Let's just use regex with negative lookbehind if possible, or just replace all and then fix the helper.
code = code.replace(/type === 'food'/g, "isAgent('food')");
code = code.replace(/type === 'medical'/g, "isAgent('medical')");
code = code.replace(/type === 'food_idea'/g, "isAgent('food_idea')");
code = code.replace(/type === 'daily_recommendation'/g, "isAgent('daily_recommendation')");

// Fix the helper
code = code.replace(
  "return isAgent('food') === targetType;", // wait it was `type === targetType`
  "return type === targetType;"
); // wait, it was `type === targetType` which doesn't match the regex. The regex replaced literal string 'food', so `type === targetType` is untouched!

// Now let's fix the two 7-way ternaries.
// First: getWelcomeMessage
code = code.replace(
  /content: isAgent\('food'\)\s*\n\s*\? 'Hello! Tell me or upload a photo of what you are planning to eat, and I will analyze its health benefits, risk factors, and full 30 nutrient breakdown based on your profile.'\s*\n\s*: isAgent\('food_idea'\)\s*\n\s*\? 'Hello! Do you have any specific food preferences or cravings today\? I will need your location to find the best dining options matching your biomarker goals.'\s*\n\s*: isAgent\('daily_recommendation'\)\s*\n\s*\? 'Hello! I am your AI Health Coach. Let me look at your clinical biomarkers, daily steps, and latest dietary intake to give you a customized, comprehensive health recommendation today.'\s*\n\s*: agentType === 'agent1'\s*\n\s*\? 'Hello! I am the Clinical Data Parser. I extract biomarkers and readings from raw text or reports into a structured format.'\s*\n\s*: agentType === 'agent2'\s*\n\s*\? 'Hello! I am the Clinical Ontologist. I map extracted biomarkers to clinical conditions and physiological risk categories.'\s*\n\s*: agentType === 'agent3'\s*\n\s*\? 'Hello! I am the Clinical Data Coordinator. I assemble mapped data into clean physiological buckets.'\s*\n\s*: agentType === 'agent4'\s*\n\s*\? 'Hello! I am the Prognostic Diagnostics Assessment agent. I analyze your biomarker history to project timeline risks and identify testing gaps.'\s*\n\s*: agentType === 'agent5'\s*\n\s*\? 'Hello! I am the Personalized Reference Ranges agent. I calibrate normal biomarker reference ranges to your exact demographics.'\s*\n\s*: agentType === 'agent6'\s*\n\s*\? 'Hello! I am the Lifestyle Precision Intervention agent. I translate diagnostic risk into strict dietary and movement targets.'\s*\n\s*: agentType === 'agent7'\s*\n\s*\? 'Hello! I am the Medical Literature Consensus agent. I scan PubMed and clinical trials to bring recent scientific debate to your context.'\s*\n\s*: agentType === 'data_review'\s*\n\s*\? \`Hello! I am your Clinical Calibration Agent. Here is what is about to happen: I will analyze \$\{dataReviewBatchIdx === 'custom' \? 'Custom Test Batch' : 'Batch ' \+ \(dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined \? \(dataReviewBatchIdx as number\) \+ 1 : 1\)\} containing your raw biomarker readings. I will automatically recognize your demographic parameters \(age, gender, ethnicity\) and calibrate all reference ranges precisely to your profile. I will then map each biomarker to its standard physiological grouping, potential medical conditions, and break down each medical range clinically \(such as Borderline High or Optimal zones\) with clear, actionable insights—all without repeating boilerplate demographic lines. Let's start the calibration!\`\s*\n\s*: 'Hello! I can help you parse blood report photos, medical test charts, or manual body logs to build a comprehensive profile of your biomarkers. What information would you like to enter today\?',/,
  `content: isUnified && activeAgentConfig?.welcomeMessage
        ? (typeof activeAgentConfig.welcomeMessage === 'function' ? activeAgentConfig.welcomeMessage({ dataReviewBatchIdx }) : activeAgentConfig.welcomeMessage)
        : isAgent('food') 
        ? 'Hello! Tell me or upload a photo of what you are planning to eat, and I will analyze its health benefits, risk factors, and full 30 nutrient breakdown based on your profile.'
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
                          : 'Hello! I can help you parse blood report photos, medical test charts, or manual body logs to build a comprehensive profile of your biomarkers. What information would you like to enter today?',`
);

// Second: Title
code = code.replace(
  /\{isAgent\('food'\)\s*\n\s*\? t.addFood\s*\n\s*: isAgent\('food_idea'\)\s*\n\s*\? 'Food ideas'\s*\n\s*: agentType === 'agent1'\s*\n\s*\? 'Clinical Data Parser'\s*\n\s*: agentType === 'agent2'\s*\n\s*\? 'Clinical Ontologist'\s*\n\s*: agentType === 'agent3'\s*\n\s*\? 'Clinical Data Coordinator'\s*\n\s*: agentType === 'agent4'\s*\n\s*\? 'Prognostic Diagnostics Assessment'\s*\n\s*: agentType === 'agent5'\s*\n\s*\? 'Personalized Reference Ranges'\s*\n\s*: agentType === 'agent6'\s*\n\s*\? 'Lifestyle Precision Intervention'\s*\n\s*: agentType === 'agent7'\s*\n\s*\? 'Medical Literature Consensus'\s*\n\s*: agentType === 'data_review'\s*\n\s*\? \`\$\{dataReviewBatchIdx === 'custom' \? 'Custom Test Batch' : 'Batch ' \+ \(dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined \? \(dataReviewBatchIdx as number\) \+ 1 : 1\)\}\`\s*\n\s*: t.addMedical\}/,
  `{isUnified && activeAgentConfig?.displayName
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
                                    : t.addMedical}`
);

fs.writeFileSync('src/components/LogChat.tsx', code);
