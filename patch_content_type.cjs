const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStr = `      return res.json({
        mode: "evaluation",
        comparison: comparisonData,
        scoutItems: visionScoutItems, // ensure the client has the bounding boxes
        agentPrompt: fullPromptSent,
        message: rawParsed.message,
        text: rawParsed.message
      });`;
const newStr = `      return res.json({
        mode: "evaluation",
        comparison: comparisonData,
        scoutItems: visionScoutItems, // ensure the client has the bounding boxes
        scoutContentType: scoutContentType,
        agentPrompt: fullPromptSent,
        message: rawParsed.message,
        text: rawParsed.message
      });`;

const oldStr2 = `      return res.json({
        mode: "new_log",
        foodData: parsedData,
        scoutItems: visionScoutItems, // ensure the client has the bounding boxes
        agentPrompt: fullPromptSent,
        message: rawParsed.message,
        text: rawParsed.message
      });`;
const newStr2 = `      return res.json({
        mode: "new_log",
        foodData: parsedData,
        scoutItems: visionScoutItems, // ensure the client has the bounding boxes
        scoutContentType: scoutContentType,
        agentPrompt: fullPromptSent,
        message: rawParsed.message,
        text: rawParsed.message
      });`;

code = code.replace(oldStr, newStr);
code = code.replace(oldStr2, newStr2);
fs.writeFileSync('server.ts', code);
console.log("Patched content type!");
