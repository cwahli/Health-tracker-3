import re

with open('server.ts', 'r') as f:
    content = f.read()

replacement = """
    const riskGroupingsWithSeverity: Record<string, string[]> = {};
    const biomarkerHistories: Record<string, {date: string, val: any}[]> = {};
    
    // Sort by date descending so first seen is latest
    const sortedHistory = [...sanitizedBiomarkerHistory].sort((a, b) => {
      const da = a.date ? new Date(a.date.split('-').reverse().join('-')).getTime() : 0;
      const db = b.date ? new Date(b.date.split('-').reverse().join('-')).getTime() : 0;
      return db - da;
    });
    
    sortedHistory.forEach((log: any) => {
      if (log.biomarkers) {
        Object.keys(log.biomarkers).forEach(key => {
          if (key === 'steps') return;
          if (!biomarkerHistories[key]) biomarkerHistories[key] = [];
          if (biomarkerHistories[key].length < 5) {
            biomarkerHistories[key].push({ date: log.date, val: log.biomarkers[key] });
          }
        });
      }
    });

    const normalBiomarkers: string[] = [];
    
    Object.keys(biomarkerHistories).forEach(key => {
      const history = biomarkerHistories[key];
      const latestVal = history[0].val;
      const historyStr = history.map(h => `${h.date}: ${h.val}`).join(', ');
      
      let bStatus = getBiomarkerStatus(key, latestVal, undefined, activeProfile?.customBiomarkers?.[key], activeProfile);
      
      if (bStatus === 'low' || bStatus === 'high' || bStatus === 'critical') {
        const statusLabel = getBiomarkerStatusLabel(key, bStatus, activeProfile?.customBiomarkers?.[key], latestVal, activeProfile);
        const def = biomarkerDefinitions.find(d => d.key === key);
        const customDef = activeProfile?.customBiomarkers?.[key];
        const medicalInsight = customDef?.benefitRisk || def?.benefitRisk || "No specific medical insight defined.";
        let risks = customDef?.riskCategories || def?.riskCategories || ['Uncategorized'];
        if (!Array.isArray(risks)) risks = [risks];
        if (risks.length === 0) risks = ['Uncategorized'];
        
        risks.forEach((risk: string) => {
          if (!riskGroupingsWithSeverity[risk]) riskGroupingsWithSeverity[risk] = [];
          riskGroupingsWithSeverity[risk].push(`${key} (Status: ${statusLabel})\\n   History (last 5): ${historyStr}\\n   Medical Insight: ${medicalInsight}`);
        });
      } else {
        normalBiomarkers.push(`${key}: ${latestVal} (History: ${historyStr})`);
      }
    });

    let groupedRisksStr = "";
    if (Object.keys(riskGroupingsWithSeverity).length > 0) {
      groupedRisksStr = "Biomarkers at risk:\\n";
      Object.keys(riskGroupingsWithSeverity).forEach(risk => {
        groupedRisksStr += `\\n[${risk}]\\n`;
        riskGroupingsWithSeverity[risk].forEach(line => {
          groupedRisksStr += `- ${line}\\n`;
        });
      });
    }

    const biomarkerSummary = Object.keys(biomarkerHistories).length > 0 ? 
      `${groupedRisksStr}\\n\\nNormal/Uncategorized Biomarkers:\\n${normalBiomarkers.join('\\n')}` : 
      "No medical biomarkers logged.";
"""

pattern = r'const riskGroupingsWithSeverity: Record<string, string\[\]> = \{\};.*?const biomarkerSummary = .*?;"No medical biomarkers logged\.";'
content = re.sub(pattern, replacement.strip(), content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
