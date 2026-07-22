const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldImport = `                                 const newPresets = JSON.parse(ev.target?.result as string);
                                 if (Array.isArray(newPresets)) {
                                   setProfile({ ...profile, themePresets: [...(profile.themePresets || []), ...newPresets] });
                                 }`;

const newImport = `                                 const parsed = JSON.parse(ev.target?.result as string);
                                 const newPresets = parsed.preset ? [parsed.preset] : (Array.isArray(parsed) ? parsed : [parsed]);
                                 if (newPresets.length > 0) {
                                   setProfile({ ...profile, themePresets: [...(profile.themePresets || []), ...newPresets] });
                                 }`;

if (!code.includes(oldImport)) {
  console.error('Old import not found!');
  process.exit(1);
}
code = code.replace(oldImport, newImport);

const oldExport = `const blob = new Blob([JSON.stringify([preset], null, 2)], { type: 'application/json' });`;

const newExport = `const exportPayload = {
  _meta: {
    format: 'health-tracker-3-theme-preset',
    version: 1,
    fields: {
      themePalette: 'Hex colours. background/bgCard/border/text/textSecondary/neutralSetting are the accessible core; textAccent/textMuted/textSuccess/textError/warning/caution/success/info are status & accent text colours; nutrientCalories/nutrientProtein/nutrientCarbs/nutrientFat/nutrientSatFat/nutrientSodium are macro chart colours.',
      fontFamily: 'Body/heading font name',
      fontMono: 'Monospace font name (numbers, code)',
      fontSize: 'Base root font size (tiny/small/normal/large/xl/xxl)',
      'fontSizeTitle / fontSizeSubtitle / fontSizeBody / fontSizeBodySmall / fontSizeSubtitleSmall / fontSizeKeyMetric / fontSizeXS': 'Per-element font size overrides',
      marginScale: 'Layout margin multiplier (compact/normal/relaxed)',
      paddingScale: 'Component inner padding multiplier (compact/normal/relaxed)',
      cornerRadius: 'Border radius scale (none/small/normal/large/pill)',
      shadowScale: 'Drop shadow intensity (none/light/normal/heavy)',
      customColors: 'User-added colour variables beyond the base set',
      customFonts: 'Renamed labels for font-size controls',
      themeOverrides: 'Raw CSS selector/property overrides (advanced)'
    }
  },
  preset
};
const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });`;

if (!code.includes(oldExport)) {
  console.error('Old export not found!');
  process.exit(1);
}
code = code.replace(oldExport, newExport);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
console.log('Successfully updated Header.tsx');
