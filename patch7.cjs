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
}`;

content = content.replace(targetProps, replacementProps);
fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched");
