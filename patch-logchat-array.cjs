const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

const targetStr = `          const newYamlStr = resData.extractedYaml || '';
          let newEntries: any[] = [];
          if (newYamlStr) {
            try {
              const cleanedNew = newYamlStr.replace(/\\\`\\\`\\\`(?:yaml|yml)?/gi, '').trim();
              const newParsed = parse(cleanedNew);`;

const newStr = `          const newYamlStr = resData.extractedYaml || '';
          let newEntries: any[] = [];
          if (newYamlStr) {
            try {
              let newParsed = newYamlStr;
              if (typeof newYamlStr === 'string') {
                const cleanedNew = newYamlStr.replace(/\\\`\\\`\\\`(?:yaml|yml|json)?/gi, '').trim();
                newParsed = parse(cleanedNew);
              }
              `;

if (content.includes("const newYamlStr = resData.extractedYaml || '';")) {
  content = content.replace(
    /const newYamlStr = resData\.extractedYaml \|\| '';\n          let newEntries: any\[\] = \[\];\n          if \(newYamlStr\) \{\n            try \{\n              const cleanedNew = newYamlStr\.replace\(\/```\(\?:yaml\|yml\)\?\/gi, ''\)\.trim\(\);\n              const newParsed = parse\(cleanedNew\);/g,
    `const newYamlStr = resData.extractedYaml || '';
          let newEntries: any[] = [];
          if (newYamlStr) {
            try {
              let newParsed = newYamlStr;
              if (typeof newYamlStr === 'string') {
                const cleanedNew = newYamlStr.replace(/\\\`\\\`\\\`(?:yaml|yml|json)?/gi, '').trim();
                newParsed = parse(cleanedNew);
              }`
  );
  
  content = content.replace(
    /const oldYamlStr = m\.data\?\.agentResult\?\.extractedYaml \|\| '';\n          let oldEntries: any\[\] = \[\];\n          if \(oldYamlStr\) \{\n            try \{\n              const cleanedOld = oldYamlStr\.replace\(\/```\(\?:yaml\|yml\)\?\/gi, ''\)\.trim\(\);\n              const oldParsed = parse\(cleanedOld\);/g,
    `const oldYamlStr = m.data?.agentResult?.extractedYaml || '';
          let oldEntries: any[] = [];
          if (oldYamlStr) {
            try {
              let oldParsed = oldYamlStr;
              if (typeof oldYamlStr === 'string') {
                const cleanedOld = oldYamlStr.replace(/\\\`\\\`\\\`(?:yaml|yml|json)?/gi, '').trim();
                oldParsed = parse(cleanedOld);
              }`
  );

  fs.writeFileSync('src/components/LogChat.tsx', content);
  console.log("Patched array parsing");
} else {
  console.log("Could not find array parsing target string.");
}
