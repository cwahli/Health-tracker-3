const fs = require('fs');
let content = fs.readFileSync('src/components/MedicalHistoryTab.tsx', 'utf8');

const targetStr = `  const getBiomarkersForSubCategory = (cat: string) => {
    return filteredBiomarkers.filter(def => {
      if (viewType === 'risk') {
        return def.riskCategories?.includes(cat);
      } else if (viewType === 'condition') {
        return def.potentialMedicalConditions?.includes(cat);
      } else {
        return def.standardMedicalGrouping === cat || (!def.standardMedicalGrouping && cat === 'Other');
      }
    });
  };`;

const newStr = `  const getBiomarkersForSubCategory = (cat: string) => {
    return filteredBiomarkers.filter(def => {
      if (viewType === 'risk') {
        if (cat === 'Uncategorized') return !def.riskCategories || def.riskCategories.length === 0;
        return def.riskCategories?.includes(cat);
      } else if (viewType === 'condition') {
        if (cat === 'Unknown') return !def.potentialMedicalConditions || def.potentialMedicalConditions.length === 0;
        return def.potentialMedicalConditions?.includes(cat);
      } else {
        return def.standardMedicalGrouping === cat || (!def.standardMedicalGrouping && cat === 'Other');
      }
    });
  };`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/components/MedicalHistoryTab.tsx', content);
  console.log("Successfully patched getBiomarkersForSubCategory");
} else {
  console.log("Could not find the target string.");
}
