const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove HealthFrontDesk component
content = content.replace(/import HealthFrontDesk from '\.\/components\/HealthFrontDesk';/, "");
content = content.replace(/<HealthFrontDesk[\s\S]*?\/>/, "");

// Use LogChat for front desk
content = content.replace(/<ErrorBoundary><LogChat type="food"/, `<ErrorBoundary><LogChat type="front_desk"\n        profile={profile}\n        isOpen={isFrontDeskOpen}\n        selectedModelId={selectedModelId}\n        onChangeModelId={setSelectedModelId}\n        onClose={() => setIsFrontDeskOpen(false)}\n        biomarkers={biomarkers}\n        biomarkerHistory={biomarkerHistory}\n        foodLogs={foodLogs}\n        onSaveProfile={(updatedP) => {\n          setProfile(updatedP);\n          saveAndSync(updatedP, foodLogs, biomarkers, biomarkerHistory, actions, dailyBenefits, report, { type: 'profile' });\n        }}\n      /></ErrorBoundary>\n      <ErrorBoundary><LogChat type="food"`);

fs.writeFileSync('src/App.tsx', content);
