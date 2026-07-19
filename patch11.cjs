const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const targetProps = `interface HeaderProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onSaveProfile?: (p: UserProfile) => Promise<void>;
  hideSensitive: boolean;
  setHideSensitive: (h: boolean) => void;
  syncState: 'synced' | 'syncing' | 'local' | 'conflict';
  onSignOut: () => void;
  onCloudSync?: () => Promise<void>;
  onForcePush?: () => Promise<void>;
  onForcePull?: () => Promise<void>;
  dbInteractions?: DbInteraction[];
  quota?: QuotaData;
  foodLogs?: FoodLog[];
  activeTab?: string;
  autoSyncDisabled?: boolean;
  onChangeAutoSyncDisabled?: (disabled: boolean) => void;
}`;

const replacementProps = `interface HeaderProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onSaveProfile?: (p: UserProfile) => Promise<void>;
  hideSensitive: boolean;
  setHideSensitive: (h: boolean) => void;
  syncState: 'synced' | 'syncing' | 'local' | 'conflict';
  onSignOut: () => void;
  onCloudSync?: () => Promise<void>;
  onForcePush?: () => Promise<void>;
  onForcePull?: () => Promise<void>;
  dbInteractions?: DbInteraction[];
  quota?: QuotaData;
  foodLogs?: FoodLog[];
  setFoodLogs?: (f: FoodLog[]) => void;
  biomarkerHistory?: any[];
  setBiomarkerHistory?: (b: any[]) => void;
  activeTab?: string;
  autoSyncDisabled?: boolean;
  onChangeAutoSyncDisabled?: (disabled: boolean) => void;
}`;

content = content.replace(targetProps, replacementProps);

// Also add it to destructuring
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
  dbInteractions,
  quota,
  foodLogs,
  activeTab = 'home',
  autoSyncDisabled = false,
  onChangeAutoSyncDisabled,
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
  dbInteractions,
  quota,
  foodLogs,
  setFoodLogs,
  biomarkerHistory,
  setBiomarkerHistory,
  activeTab = 'home',
  autoSyncDisabled = false,
  onChangeAutoSyncDisabled,
}: HeaderProps) {`;

content = content.replace(targetDestruct, replacementDestruct);

fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched Header.tsx Props & Destructuring");
