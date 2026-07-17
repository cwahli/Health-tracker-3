const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/NutritionLabelTable.tsx', 'utf8');

const target = `                        let numVal = null;
                        if (originalVal !== undefined && originalVal !== null) {
                          const match = String(originalVal).match(/[\\d.]+/);
                          if (match) numVal = parseFloat(match[0]);
                        }
                        
                        let totalStr = '-';
                        if (numVal !== null && !missingWeight) {
                          let multiplier = 1;
                          const wasFromRaw = item.rawNutritionLabel?.[k] !== undefined;
                          
                          if (wasFromRaw && item.rawNutritionLabel?.servingSize) {
                             const ssMatch = String(item.rawNutritionLabel.servingSize).match(/[\\d.]+/);
                             if (ssMatch) {
                               multiplier = item.estimatedWeightGrams / parseFloat(ssMatch[0]);
                             } else {
                               multiplier = item.estimatedWeightGrams / 100;
                             }
                          } else {
                             multiplier = item.estimatedWeightGrams / 100;
                          }
                          
                          const total = (numVal * multiplier).toFixed(1).replace(/\\.0$/, '');
                          const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                          const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                          const unit = String(originalVal).replace(/[\\d.\\s]/g, '') || defaultUnit;
                          totalStr = \`\${total}\${unit}\`;
                        }

                        let originalDisplay = '-';
                        if (originalVal !== undefined && originalVal !== null) {
                          const hasUnit = /[a-zA-Z%]/.test(String(originalVal));
                          if (hasUnit) {
                            originalDisplay = String(originalVal);
                          } else {
                            const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                            const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                            originalDisplay = \`\${originalVal}\${defaultUnit}\`;
                          }
                        }

                        return (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                              {originalDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-indigo-600 dark:text-indigo-400 font-bold">
                              {totalStr}
                            </td>
                          </tr>
                        );`;

const replacement = `                        let numVal = null;
                        if (originalVal !== undefined && originalVal !== null) {
                          const match = String(originalVal).match(/[\\d.]+/);
                          if (match) numVal = parseFloat(match[0]);
                        }
                        
                        const isServingField = k.toLowerCase().includes('serving');
                        
                        let totalStr = '-';
                        if (numVal !== null && !missingWeight) {
                          let multiplier = 1;
                          const wasFromRaw = item.rawNutritionLabel?.[k] !== undefined;
                          
                          if (wasFromRaw && item.rawNutritionLabel?.servingSize) {
                             const ssMatch = String(item.rawNutritionLabel.servingSize).match(/[\\d.]+/);
                             if (ssMatch) {
                               multiplier = item.estimatedWeightGrams / parseFloat(ssMatch[0]);
                             } else {
                               multiplier = item.estimatedWeightGrams / 100;
                             }
                          } else {
                             multiplier = item.estimatedWeightGrams / 100;
                          }
                          
                          const total = (numVal * multiplier).toFixed(1).replace(/\\.0$/, '');
                          const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                          const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (isServingField ? '' : (nutDef ? nutDef.unit : 'g'));
                          const unit = String(originalVal).replace(/[\\d.\\s]/g, '') || defaultUnit;
                          if (isServingField) {
                            totalStr = '-';
                          } else {
                            totalStr = \`\${total}\${unit}\`;
                          }
                        }

                        let originalDisplay = '-';
                        if (originalVal !== undefined && originalVal !== null) {
                          const hasUnit = /[a-zA-Z%]/.test(String(originalVal));
                          if (hasUnit && !isServingField) {
                            originalDisplay = String(originalVal);
                          } else {
                            const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                            const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (isServingField ? '' : (nutDef ? nutDef.unit : 'g'));
                            originalDisplay = \`\${originalVal}\${defaultUnit}\`;
                          }
                        }

                        return (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 relative group/tooltip">
                              <div className="flex items-center gap-1">
                                {originalDisplay}
                                {k.toLowerCase().includes('calories') && item.autoCorrectedCalories && (
                                  <div className="relative z-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 cursor-help">
                                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                      <path d="M12 9v4"></path>
                                      <path d="M12 17h.01"></path>
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-normal min-w-[200px] w-max max-w-[250px] p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg text-center">
                                      Received abnormal value of {item.originalCalories} kcal which deviated &gt;20% from calculation (Fat×9 + Carbs×4 + Protein×4). Auto-corrected to {originalDisplay}.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-indigo-600 dark:text-indigo-400 font-bold">
                              {totalStr}
                            </td>
                          </tr>
                        );`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', content);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
