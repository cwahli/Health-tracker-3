const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr3 = `              try { localStorage.setItem('approved_agent1_batches', JSON.stringify(approved)); } catch(e){ console.warn("Quota exceeded approved_agent1"); }
              // Update React States
              setBiomarkers(recomputedBiomarkers);
            } else {`;

const replacementStr3 = `              try { localStorage.setItem('approved_agent1_batches', JSON.stringify(approved)); } catch(e){ console.warn("Quota exceeded approved_agent1"); }
              // Update React States
              setBiomarkerHistory([...hHistory]);
              setBiomarkers(recomputedBiomarkers);
            } else {`;

content = content.replace(targetStr3, replacementStr3);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched setBiomarkerHistory in branch 1");
