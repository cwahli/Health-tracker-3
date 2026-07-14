const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const replacement = `
                              {/* B. Profile-Based Key Nutrients table */}
                              <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                                    📋 Key Nutrients to Monitor
                                  </span>
                                </div>
                                <div className="px-3 py-2 space-y-3 text-[11px] font-mono">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                    {(() => {
                                      // Default top nutrients for this user if not defined in profile yet
                                      const profileTopNutrients = profile?.topNutrientsToMonitor || ["calories", "saturatedFat", "sodium"];
                                      return nutrientDefinitions
                                        .filter(nut => profileTopNutrients.includes(nut.key))
                                        .map((nut) => {
                                          const val = msg.data?.pendingFoodLog?.nutrients?.[nut.key];
                                          return (
                                            <div key={nut.key} className="flex justify-between py-0.5 text-slate-600 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/30 last:border-b-0 sm:even:border-l sm:even:pl-4">
                                              <span className="text-slate-500 font-sans">{nut.labels[profile?.language || 'en'] || nut.labels.en}:</span>
                                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                {val !== undefined ? \`\${val} \${nut.unit}\` : \`--\`}
                                              </span>
                                            </div>
                                          );
                                        });
                                    })()}
                                  </div>
                                </div>
                              </div>`;

code = code.replace(/\{\/\* B\. Full 31-nutrient table \*\/\}[\s\S]*?\{\/\* Additional Nutrients \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, replacement);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard 31 nutrients replaced with top nutrients');
