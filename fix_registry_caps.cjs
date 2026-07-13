const fs = require('fs');
let code = fs.readFileSync('src/utils/agentConfig.ts', 'utf8');

code = code.replace(
  "capabilities: ['data_validation'],",
  "capabilities: ['data_validation', 'biomarker_table_view'],"
);
code = code.replace(
  "capabilities: ['data_standardization'],",
  "capabilities: ['data_standardization', 'biomarker_table_view'],"
);
code = code.replace(
  "capabilities: ['clinical_context'],",
  "capabilities: ['clinical_context', 'biomarker_table_view'],"
);
code = code.replace(
  "capabilities: ['terminology_consolidation'],",
  "capabilities: ['terminology_consolidation', 'biomarker_table_view'],"
);
code = code.replace(
  "capabilities: ['biomarker_synthesis'],",
  "capabilities: ['biomarker_synthesis', 'biomarker_table_view'],"
);

code = code.replace(
  "capabilities: ['holistic_analysis'],",
  "capabilities: ['holistic_analysis', 'insight_card_view'],"
);
code = code.replace(
  "capabilities: ['action_planning'],",
  "capabilities: ['action_planning', 'insight_card_view'],"
); // Note: action_planning is also used for daily_recommendation, which is fine
code = code.replace(
  "capabilities: ['report_generation'],",
  "capabilities: ['report_generation', 'insight_card_view'],"
);

fs.writeFileSync('src/utils/agentConfig.ts', code);
