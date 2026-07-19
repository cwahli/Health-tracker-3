const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const s1 = '    if (agentType === "agent4") {';
const s2 = '      recentMeals = [];';
const s3 = '      biomarkerHistory = [];';
const s4 = '    const allBiomarkerKeys = Array.from(new Set([';
const s5 = '      required: ["extractedData", "text", "hasMoreMarkers", "remainingText", "estimatedTotalMarkers"]\n    };';

const i1 = content.indexOf(s1);
const i4 = content.indexOf(s4);
const i5 = content.indexOf(s5) + s5.length;

if (i1 !== -1 && i4 !== -1 && i5 !== -1 && i4 > i1) {
  const schemaBlock = content.substring(i4, i5);
  // Remove schema from inside
  let newContent = content.substring(0, i4) + content.substring(i5);
  // Put schema before i1
  newContent = newContent.substring(0, i1) + schemaBlock + '\n' + newContent.substring(i1);
  fs.writeFileSync('server.ts', newContent);
  console.log("Moved successfully!");
} else {
  console.log("Failed to find indices.");
}
