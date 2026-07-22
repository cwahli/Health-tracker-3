const fs = require('fs');

const missingLines = `export interface UserProfile {
  email?: string;
  nickname?: string;
  photoUrl?: string;
  age?: number | string;
  gender?: string;
  ethnicity?: string;
  height?: number | string;
  weight?: number | string;
  bloodType?: string;
  language?: string;
  timezone?: string;
  unitPreference?: string;
  targetCalories?: number | string;
  targetCarbs?: number | string;
  targetFats?: number | string;
  targetFibre?: number | string;
  targetProtein?: number | string;
  targetSaturatedFat?: number | string;
  targetSodium?: number | string;
  targetSugar?: number | string;
  topNutrientsToMonitor?: string[];
  
  fontSize?: string;
  fontSizeTitle?: string;
  fontSizeSubtitle?: string;
  fontSizeDescription?: string;
  fontSizeBody?: string;
  fontSizeBodySmall?: string;
  fontSizeSubtitleSmall?: string;
  fontSizeKeyMetric?: string;
  fontSizeXS?: string;
  fontFamily?: string;
  fontMono?: string;
  marginScale?: 'compact' | 'normal' | 'relaxed';
  paddingScale?: 'compact' | 'normal' | 'relaxed';
  cornerRadius?: 'none' | 'small' | 'normal' | 'large' | 'pill';
  shadowScale?: 'none' | 'light' | 'normal' | 'heavy';
`;

let currentTypes = fs.readFileSync('src/types.ts', 'utf8');
fs.writeFileSync('src/types.ts', missingLines + currentTypes);
