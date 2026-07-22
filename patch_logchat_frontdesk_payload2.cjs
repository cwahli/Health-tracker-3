const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

const injection = `
      if (isAgent('front_desk')) {
        bodyData.profile = bodyData.userProfile;
        bodyData.biomarkers = biomarkers;
        bodyData.foodLogs = (foodLogs || []).map(f => ({ name: f.name, date: f.date, nutrients: f.nutrients }));
      }
      if (compareOnly) {`;

content = content.replace(/      if \(compareOnly\) \{/, injection);

fs.writeFileSync('src/components/LogChat.tsx', content);
