const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

// Fix my mistake
content = content.replace(/props\.onSaveProfile/g, "onSaveProfile");
content = content.replace(/props\.onAddBiomarkerLogs/g, "onAddBiomarkerLogs");

// Add onAddBiomarkerLogs to props
content = content.replace(/onSaveProfile\?: \(profile: UserProfile\) => Promise<void>;/, "onSaveProfile?: (profile: UserProfile) => Promise<void>;\n  onAddBiomarkerLogs?: (logs: any[]) => void;");
content = content.replace(/onSaveProfile,\n/, "onSaveProfile,\n  onAddBiomarkerLogs,\n");

fs.writeFileSync('src/components/LogChat.tsx', content);
