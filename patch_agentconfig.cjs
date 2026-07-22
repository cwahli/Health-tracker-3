const fs = require('fs');
let content = fs.readFileSync('src/utils/agentConfig.ts', 'utf-8');

content = content.replace(/'health_baseline';/, "'health_baseline' | 'front_desk';");

const newAgent = `  front_desk: {
    id: 'front_desk',
    category: 'system',
    displayName: 'Health Front Desk',
    description: 'Answers general questions, routes users, and updates health data.',
    capabilities: ['general_qa', 'routing', 'profile_update', 'biomarker_logging'],
    welcomeMessage: 'Hello! I am your Health Front Desk Agent. How can I help you today? You can ask me about your health data, or I can help you update your profile. I can also direct you to one of our specialized agents.',
    rolloutStatus: 'unified',
  },
  health_baseline: {`;

content = content.replace(/  health_baseline: \{/, newAgent);

fs.writeFileSync('src/utils/agentConfig.ts', content);
