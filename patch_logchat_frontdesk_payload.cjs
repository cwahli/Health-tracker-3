const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

const injection = `
      if (isAgent('front_desk')) {
        bodyData.profile = bodyData.userProfile;
        bodyData.biomarkers = biomarkers;
        bodyData.foodLogs = foodLogs;
      }
      if (isAgent('food')) {`;

content = content.replace(/      if \(isAgent\('food'\)\) \{/, injection);

fs.writeFileSync('src/components/LogChat.tsx', content);
