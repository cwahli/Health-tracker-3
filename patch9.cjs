const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<Header
        profile={profile}
        setProfile={(p) => {`;

const replacement = `<Header
        biomarkerHistory={biomarkerHistory}
        setBiomarkerHistory={setBiomarkerHistory}
        setFoodLogs={setFoodLogs}
        profile={profile}
        setProfile={(p) => {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
