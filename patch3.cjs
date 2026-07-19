const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    // Immediately populate state from local storage so the UI is responsive
    if (parsedLocal && (!profile || !isSameUser)) {
      if (parsedLocal.profile) setProfile(parsedLocal.profile);
      // We omit setFoodLogs here since foodLogs is natively managed by onSnapshot and localStorage stores it as empty []
      if (parsedLocal.biomarkers) setBiomarkers(parsedLocal.biomarkers);`;

const replacement = `    // Immediately populate state from local storage so the UI is responsive
    if (parsedLocal && (!profile || !isSameUser)) {
      if (parsedLocal.profile) setProfile(parsedLocal.profile);
      if (parsedLocal.foodLogs && parsedLocal.foodLogs.length > 0) setFoodLogs(parsedLocal.foodLogs);
      if (parsedLocal.biomarkers) setBiomarkers(parsedLocal.biomarkers);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
} else {
  console.log("Target not found!");
}
