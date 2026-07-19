const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    const abortWithLocalFallback = () => {
      if (parsedLocal) {
        if (parsedLocal.foodLogs) setFoodLogs(parsedLocal.foodLogs);
        if (parsedLocal.profile) setProfile(parsedLocal.profile);
        if (parsedLocal.biomarkers) setBiomarkers(parsedLocal.biomarkers);
        if (parsedLocal.biomarkerHistory) setBiomarkerHistory(parsedLocal.biomarkerHistory);
        if (parsedLocal.actions) setActions(parsedLocal.actions);
        if (parsedLocal.dailyBenefits) setDailyBenefits(parsedLocal.dailyBenefits);
        if (parsedLocal.report) setReport(parsedLocal.report);
      }
      setSyncState('local');
    };`;

const replacement = `    const abortWithLocalFallback = async () => {
      // First try to recover from our manual localStorage cache
      let hasLocalFoods = false;
      let hasLocalBio = false;
      if (parsedLocal) {
        if (parsedLocal.profile) setProfile(parsedLocal.profile);
        if (parsedLocal.biomarkers) setBiomarkers(parsedLocal.biomarkers);
        if (parsedLocal.actions) setActions(parsedLocal.actions);
        if (parsedLocal.dailyBenefits) setDailyBenefits(parsedLocal.dailyBenefits);
        if (parsedLocal.report) setReport(parsedLocal.report);
        if (parsedLocal.foodLogs && parsedLocal.foodLogs.length > 0) {
          setFoodLogs(parsedLocal.foodLogs);
          hasLocalFoods = true;
        }
        if (parsedLocal.biomarkerHistory && parsedLocal.biomarkerHistory.length > 0) {
          setBiomarkerHistory(parsedLocal.biomarkerHistory);
          hasLocalBio = true;
        }
      }
      
      // If manual cache was overwritten/empty, try to aggressively recover from Firestore IndexedDB cache!
      if (!hasLocalFoods || !hasLocalBio) {
        try {
          console.log("[Offline Recovery] Attempting to recover data from Firestore IndexedDB Cache...");
          const consolidatedSnap = await getDocsFromCache(collection(db, 'users', uid, 'consolidated_logs'));
          const recoveredFoods = [];
          const recoveredBio = [];
          consolidatedSnap.forEach(doc => {
            const data = doc.data();
            if (data.logs) {
              Object.values(data.logs).forEach(log => {
                if (log.type === 'food') recoveredFoods.push(log);
                if (log.type === 'biomarker') recoveredBio.push(log);
              });
            }
          });
          
          if (!hasLocalFoods && recoveredFoods.length > 0) {
            console.log(\`[Offline Recovery] Recovered \${recoveredFoods.length} food logs from cache!\`);
            setFoodLogs(recoveredFoods);
          }
          if (!hasLocalBio && recoveredBio.length > 0) {
            console.log(\`[Offline Recovery] Recovered \${recoveredBio.length} biomarker logs from cache!\`);
            setBiomarkerHistory(recoveredBio);
          }
        } catch (e) {
          console.warn("[Offline Recovery] Failed to read Firestore cache:", e);
        }
      }
      
      setSyncState('local');
    };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
} else {
  console.log("Target not found!");
}
