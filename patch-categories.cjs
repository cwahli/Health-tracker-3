const fs = require('fs');
let content = fs.readFileSync('src/components/MedicalHistoryTab.tsx', 'utf8');

const targetStr = `  const subCategories = useMemo(() => {
    if (viewType === 'risk') {
      const allRisks = new Set<string>();
      allDefinitions.forEach(def => {
        def.riskCategories?.forEach(r => {
          if (r) allRisks.add(r);
        });
      });
      return ['all', ...Array.from(allRisks).sort()];
    } else if (viewType === 'condition') {
      const allConditions = new Set<string>();
      allDefinitions.forEach(def => {
        def.potentialMedicalConditions?.forEach(c => {
          if (c) allConditions.add(c);
        });
      });
      return ['all', ...Array.from(allConditions).sort()];
    } else {
      const allPractices = new Set<string>();
      allDefinitions.forEach(def => {
        if (def.standardMedicalGrouping) {
          allPractices.add(def.standardMedicalGrouping);
        } else {
          allPractices.add('Other');
        }
      });
      return ['all', ...Array.from(allPractices).sort()];
    }
  }, [allDefinitions, viewType]);`;

const newStr = `  const subCategories = useMemo(() => {
    if (viewType === 'risk') {
      const allRisks = new Set<string>();
      let hasUncategorized = false;
      allDefinitions.forEach(def => {
        if (!def.riskCategories || def.riskCategories.length === 0) {
           hasUncategorized = true;
        } else {
          def.riskCategories.forEach(r => {
            if (r) allRisks.add(r);
          });
        }
      });
      const arr = Array.from(allRisks).sort();
      if (hasUncategorized) arr.push('Uncategorized');
      return ['all', ...arr];
    } else if (viewType === 'condition') {
      const allConditions = new Set<string>();
      let hasUnknown = false;
      allDefinitions.forEach(def => {
        if (!def.potentialMedicalConditions || def.potentialMedicalConditions.length === 0) {
           hasUnknown = true;
        } else {
          def.potentialMedicalConditions.forEach(c => {
            if (c) allConditions.add(c);
          });
        }
      });
      const arr = Array.from(allConditions).sort();
      if (hasUnknown) arr.push('Unknown');
      return ['all', ...arr];
    } else {
      const allPractices = new Set<string>();
      allDefinitions.forEach(def => {
        let groupName = def.standardMedicalGrouping;
        if (!groupName || groupName === 'Other') {
           groupName = getPhysiologicalBucket(def.key, def.name);
        }
        allPractices.add(groupName);
      });
      return ['all', ...Array.from(allPractices).sort()];
    }
  }, [allDefinitions, viewType]);`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/components/MedicalHistoryTab.tsx', content);
  console.log("Successfully patched categories logic");
} else {
  console.log("Could not find the target string.");
}
