const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const targetStr = `      const bodyData: any = {
        agentType: 'agent1_step1',
        message: \`continue: \${allUserText}\`,`;

const newStr = `      const bodyData: any = {
        agentType: 'agent1_step1',
        message: \`continue\`,`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/components/LogChat.tsx', content);
  console.log("Successfully patched LogChat.tsx");
} else {
  console.log("Could not find the target string.");
}
