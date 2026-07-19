const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const targetDestruct = `export default function Header({
  profile,
  setProfile,
  onSaveProfile,
  hideSensitive,
  setHideSensitive,
  syncState,
  onSignOut,
  onCloudSync,
  onForcePush,
  onForcePull,
  dbInteractions = [],
  quota,
  foodLogs = [],
  activeTab = 'home',
  autoSyncDisabled = false,
  onChangeAutoSyncDisabled
}: HeaderProps) {`;

const replacementDestruct = `export default function Header({
  profile,
  setProfile,
  onSaveProfile,
  hideSensitive,
  setHideSensitive,
  syncState,
  onSignOut,
  onCloudSync,
  onForcePush,
  onForcePull,
  dbInteractions = [],
  quota,
  foodLogs = [],
  setFoodLogs,
  biomarkerHistory = [],
  setBiomarkerHistory,
  activeTab = 'home',
  autoSyncDisabled = false,
  onChangeAutoSyncDisabled
}: HeaderProps) {`;

content = content.replace(targetDestruct, replacementDestruct);
fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched destructuring");
