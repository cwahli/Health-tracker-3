const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const oldFoodsMap = /\{\(msg\.data\?\.agentResult\.comparison\.foods \|\| \[\]\)\.map\(\(food: any, idx: number\) => \{[\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}\s*\{\/\* Full-screen image preview/;

const newGroupsMap = `{(msg.data?.agentResult.comparison.groups || []).map((group: any, idx: number) => {
                          const lowerSuit = String(group.suitability || '').toLowerCase();
                          const isBest = lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('recommended') || lowerSuit.includes('good') || lowerSuit.includes('perfect');
                          
                          let suitabilityClass = "text-slate-700 dark:text-slate-300";
                          let suitabilityBadgeBg = "bg-slate-100 dark:bg-slate-800";
                          if (lowerSuit.includes('good') || lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('low risk')) {
                            suitabilityClass = "text-emerald-700 dark:text-emerald-400";
                            suitabilityBadgeBg = "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50";
                          } else if (lowerSuit.includes('moderate') || lowerSuit.includes('medium') || lowerSuit.includes('caution') || lowerSuit.includes('amber') || lowerSuit.includes('yellow')) {
                            suitabilityClass = "text-amber-700 dark:text-amber-400";
                            suitabilityBadgeBg = "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50";
                          } else if (lowerSuit.includes('bad') || lowerSuit.includes('avoid') || lowerSuit.includes('high risk') || lowerSuit.includes('severe') || lowerSuit.includes('red')) {
                            suitabilityClass = "text-rose-700 dark:text-rose-400";
                            suitabilityBadgeBg = "bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50";
                          }

                          const concern = (msg.data?.agentResult.comparison.keyNutrientConcern || '').toLowerCase();
                          const PROFILE_TOP_NUTRIENTS = ['saturatedfat', 'sodium'];
                          
                          const nutrientRows = group.averageNutrients 
                            ? Object.entries(group.averageNutrients)
                                .filter(([k,v]) => k !== 'calories' && v !== null && v !== undefined)
                                .filter(([k,v]) => {
                                  const kLower = k.toLowerCase().replace(/\\s+/g, '');
                                  const inConcern = concern.includes(kLower.replace('total', '')) || (kLower === 'sodium' && concern.includes('sod')) || (kLower === 'saturatedfat' && concern.includes('sat'));
                                  const isTop = PROFILE_TOP_NUTRIENTS.some(n => kLower.includes(n));
                                  return inConcern || isTop || kLower === 'protein';
                                })
                                .sort((a, b) => {
                                  const aLower = a[0].toLowerCase().replace(/\\s+/g, '');
                                  const bLower = b[0].toLowerCase().replace(/\\s+/g, '');
                                  
                                  const aConcern = concern.includes(aLower.replace('total', '')) || (aLower === 'sodium' && concern.includes('sod')) || (aLower === 'saturatedfat' && concern.includes('sat'));
                                  const bConcern = concern.includes(bLower.replace('total', '')) || (bLower === 'sodium' && concern.includes('sod')) || (bLower === 'saturatedfat' && concern.includes('sat'));
                                  
                                  if (aConcern && !bConcern) return -1;
                                  if (!aConcern && bConcern) return 1;
                                  
                                  const aTop = PROFILE_TOP_NUTRIENTS.some(n => aLower.includes(n));
                                  const bTop = PROFILE_TOP_NUTRIENTS.some(n => bLower.includes(n));
                                  if (aTop && !bTop) return -1;
                                  if (!aTop && bTop) return 1;
                                  
                                  return 0;
                                })
                                .map(([k,v]) => {
                                  const vals: any[] = [];
                                  vals[idx] = v;
                                  return { nutrient: k, values: vals };
                                }).slice(0, 3)
                            : [];

                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <div className="w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch my-2 shrink-0 mx-[10px]" />
                              )}
                              <div className="w-[300px] shrink-0 snap-align-start flex flex-col relative space-y-3">
                                
                                <div className="flex flex-col gap-1.5">
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-snug">
                                    {group.groupName}
                                  </h4>
                                  {group.suitability && (
                                    <div className={\`\${suitabilityBadgeBg} \${suitabilityClass} uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit\`}>
                                      {group.suitability.toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Aggregated Nutrients */}
                                <div className="space-y-1">
                                  {group.averageNutrients?.calories !== undefined && (
                                    <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100 dark:border-slate-800/50">
                                      <span className="text-slate-500">Average Calories</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{group.averageNutrients.calories} kcal</span>
                                    </div>
                                  )}
                                  {nutrientRows.map((row: any, rIdx: number) => {
                                    const val = row.values[idx] !== undefined && row.values[idx] !== null ? row.values[idx] : '--';
                                    const nutDef = nutrientDefinitions.find(n => n.key.toLowerCase() === row.nutrient.toLowerCase());
                                    const unit = nutDef ? nutDef.unit : 'g';
                                    const label = nutDef ? (nutDef.labels[profile?.language || 'en'] || nutDef.labels.en) : row.nutrient;
                                    return (
                                      <div key={rIdx} className="flex justify-between items-center text-xs pb-1 border-b border-slate-100 dark:border-slate-800/50">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{val} {unit}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Pros and Cons */}
                                <div className="space-y-1.5 pt-1">
                                  {group.pros && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Pros:</span> {group.pros}
                                    </p>
                                  )}
                                  {group.cons && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                                      <span className="font-semibold text-rose-600 dark:text-rose-400">✗ Cons:</span> {group.cons}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Items in this bucket */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Foods in this group
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(group.items || []).map((item: any, itemIdx: number) => {
                                      // Find a matching visual scout item for cropping as a fallback
                                      const matchingScout = (msg.data?.scoutItems || []).find((s: any) => 
                                        item.name.toLowerCase().includes(s.keyword.toLowerCase()) || 
                                        s.keyword.toLowerCase().includes(item.name.toLowerCase()) ||
                                        item.name.toLowerCase().split(' ')[0] === s.keyword.toLowerCase().split(' ')[0]
                                      );

                                      // Food picture priority: user uploaded first based on sourceImageIndex, fallback to external
                                      const imgIdx = typeof item.sourceImageIndex === 'number' 
                                        ? item.sourceImageIndex 
                                        : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
                                      
                                      const resolvedImgSrc = (messageImages.length > 0)
                                        ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                        : getFoodImageUrl(item.name, '');

                                      const bb = item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);

                                      return (
                                        <div key={itemIdx} className="flex flex-col items-center gap-1 w-[72px]">
                                          <div 
                                            className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 cursor-pointer shadow-sm hover:ring-2 ring-indigo-500/50 transition-all shrink-0"
                                            onClick={() => setFullScreenImg({ src: resolvedImgSrc, boundingBox: bb })}
                                          >
                                            {bb ? (
                                              <CroppedFoodImage 
                                                src={resolvedImgSrc} 
                                                boundingBox={bb} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover"
                                                imageUrls={messageImages}
                                              />
                                            ) : (
                                              <img 
                                                src={resolvedImgSrc} 
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80&auto=format';
                                                }}
                                              />
                                            )}
                                          </div>
                                          <span className="text-[10px] text-center font-medium leading-tight text-slate-700 dark:text-slate-300 break-words w-full line-clamp-2">
                                            {item.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                              </div>
                            </React.Fragment>

                          );
                        })}
                      </div>

                    </div>
                  )}

      {/* Full-screen image preview overlay modal */`;

code = code.replace(oldFoodsMap, newGroupsMap);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard groups patched');
