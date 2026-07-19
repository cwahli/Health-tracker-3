const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `              // 2. Apply newly cleaned/standardized readings from parsedRows
              parsedRows.forEach((row: any) => {
                const key = row.key || (row.name || row.biomarker || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                if (!key) return;
                const name = row.name || row.biomarker || 'Unknown';
                const unit = row.metric || row.unit || '';
                // Update customBiomarker definition
                const existing: any = updatedCustoms[key] || {};
                updatedCustoms[key] = {
                  ...existing,
                  name,
                  unit,
                  riskCategories: (existing.riskCategories && existing.riskCategories.length > 0) ? existing.riskCategories : (row.riskCategories || []),
                  standardMedicalGrouping: (existing.standardMedicalGrouping && existing.standardMedicalGrouping !== 'Other') ? existing.standardMedicalGrouping : (row.standardMedicalGrouping || 'Other'),
                  potentialMedicalConditions: row.potentialMedicalConditions || existing.potentialMedicalConditions || []
                } as any;
              });`;

const replacementStr = `              // 2. Apply newly cleaned/standardized readings from parsedRows
              parsedRows.forEach((row: any) => {
                const key = row.key || (row.name || row.biomarker || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                if (!key) return;
                const name = row.name || row.biomarker || 'Unknown';
                const unit = row.metric || row.unit || '';
                // Update customBiomarker definition
                const existing: any = updatedCustoms[key] || {};
                updatedCustoms[key] = {
                  ...existing,
                  name,
                  unit,
                  riskCategories: (existing.riskCategories && existing.riskCategories.length > 0) ? existing.riskCategories : (row.riskCategories || []),
                  standardMedicalGrouping: (existing.standardMedicalGrouping && existing.standardMedicalGrouping !== 'Other') ? existing.standardMedicalGrouping : (row.standardMedicalGrouping || 'Other'),
                  potentialMedicalConditions: row.potentialMedicalConditions || existing.potentialMedicalConditions || []
                } as any;

                // CRITICAL FIX: Merge the extracted value and date into hHistory
                if (row.value !== undefined && row.date && row.date !== 'N/A') {
                   const rowDate = String(row.date).trim();
                   const parsedDateStr = rowDate.split('T')[0];
                   
                   // Try to find exact existing entry for this date
                   let historyLog = hHistory.find((h: any) => {
                     const logDateStr = String(h.date || '').split('T')[0];
                     // if it exactly matches the day
                     if (logDateStr === parsedDateStr) {
                       return true;
                     }
                     return false;
                   });
                   
                   if (!historyLog) {
                     historyLog = {
                       id: 'bio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                       date: rowDate.includes('T') ? rowDate : rowDate + 'T12:00:00Z',
                       biomarkers: {},
                       sync_state: 'new'
                     };
                     hHistory.push(historyLog);
                   }
                   
                   historyLog.biomarkers[key] = row.valueNumeric !== undefined && row.valueNumeric !== null 
                     ? row.valueNumeric 
                     : (isNaN(Number(row.value)) ? row.value : Number(row.value));
                     
                   historyLog.updated_at = Date.now();
                }
              });`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched onAgentFinish to save values in hHistory");
