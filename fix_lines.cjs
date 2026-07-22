const fs = require('fs');
let lines = fs.readFileSync('src/components/Header.tsx', 'utf-8').split('\n');

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes("logsText={agentLogs.map")) {
    lines[i] = "        logsText={agentLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\\n')}";
    if (lines[i+1].includes("')}")) {
      lines.splice(i+1, 1);
    }
  }
  if (lines[i] && lines[i].includes("logsArray={agentLogs.map")) {
    lines[i] = "        logsArray={agentLogs.map(l => `[${l.timestamp}]\\n${l.message}`)}";
    if (lines[i+1] && lines[i+1].includes("${l.message}`)}")) {
      lines.splice(i+1, 1);
    }
  }
}

fs.writeFileSync('src/components/Header.tsx', lines.join('\n'));
