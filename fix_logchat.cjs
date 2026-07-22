const fs = require('fs');
let content = fs.readFileSync('src/components/LogChat.tsx', 'utf-8');

// Undo the incorrect replacement
const badInjection = `
      if (resData.updatedProfile && onSaveProfile) {
        onSaveProfile(resData.updatedProfile);
      }
      if (resData.newBiomarkerLogs && resData.newBiomarkerLogs.length > 0 && onAddBiomarkerLogs) {
        onAddBiomarkerLogs(resData.newBiomarkerLogs);
      }

      if (isAgent('food')) {`;

content = content.replace(badInjection, "\n      if (isAgent('food')) {");
content = content.replace(badInjection, "\n      if (isAgent('food')) {"); // Just in case there are multiple

// Find the handleSend function where resData is parsed and insert the logic.
// Search for: const assistantMsg: ChatMessage = {
const injection2 = `      if (resData.updatedProfile && onSaveProfile) {
        onSaveProfile(resData.updatedProfile);
      }
      if (resData.newBiomarkerLogs && resData.newBiomarkerLogs.length > 0 && onAddBiomarkerLogs) {
        onAddBiomarkerLogs(resData.newBiomarkerLogs);
      }

      const assistantMsg: ChatMessage = {`;

content = content.replace(/      const assistantMsg: ChatMessage = \{/, injection2);

// Re-add onAddBiomarkerLogs to props
if (!content.includes("onAddBiomarkerLogs?: (logs: any[]) => void;")) {
  content = content.replace(/onSaveProfile\?: \(profile: UserProfile\) => Promise<void>;/, "onSaveProfile?: (profile: UserProfile) => Promise<void>;\n  onAddBiomarkerLogs?: (logs: any[]) => void;");
  content = content.replace(/onSaveProfile,\n/, "onSaveProfile,\n  onAddBiomarkerLogs,\n");
}

fs.writeFileSync('src/components/LogChat.tsx', content);
