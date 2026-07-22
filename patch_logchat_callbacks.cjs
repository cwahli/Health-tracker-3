const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

const injection = `
      if (resData.updatedProfile && props.onSaveProfile) {
        props.onSaveProfile(resData.updatedProfile);
      }
      if (resData.newBiomarkerLogs && resData.newBiomarkerLogs.length > 0 && props.onAddBiomarkerLogs) {
        props.onAddBiomarkerLogs(resData.newBiomarkerLogs);
      }

      if (isAgent('food')) {`;

content = content.replace(/      if \(isAgent\('food'\)\) \{/, injection);

fs.writeFileSync('src/components/LogChat.tsx', content);
