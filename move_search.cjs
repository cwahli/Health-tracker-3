const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const mapStart = `                                                return (
                                                  <div key={itemIdx} className="relative flex flex-col gap-2 flex-grow-0 max-w-[48%] sm:max-w-[32%] md:max-w-[24%]">
                                                      {chipContent}
                                                      {!!searchResults[fullItemKey] && (
                                                          <button 
                                                            onClick={(e) => { e.stopPropagation(); setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc }); }}
                                                            className="absolute -top-1.5 -right-1.5 p-1 bg-slate-900/80 text-white rounded-full transition-colors z-10 shadow-sm"
                                                            title="View original photo"
                                                          >
                                                            <Eye className="w-3 h-3" />
                                                          </button>
                                                      )}
                                                  </div>
                                                );`;

const newMapStart = `                                                const isActiveItem = searchModes[fullItemKey];
                                                const itemResults = searchResults[fullItemKey] || [];
                                                const itemLoading = !!searchLoading[fullItemKey];

                                                return (
                                                  <React.Fragment key={itemIdx}>
                                                    <div className="relative flex flex-col gap-2 flex-grow-0 max-w-[48%] sm:max-w-[32%] md:max-w-[24%]">
                                                        {chipContent}
                                                        {!!searchResults[fullItemKey] && (
                                                            <button 
                                                              onClick={(e) => { e.stopPropagation(); setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc }); }}
                                                              className="absolute -top-1.5 -right-1.5 p-1 bg-slate-900/80 text-white rounded-full transition-colors z-10 shadow-sm"
                                                              title="View original photo"
                                                            >
                                                              <Eye className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {isActiveItem && (
                                                      <div className="col-span-full w-full basis-full mt-3 mb-5 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 bg-white/50 dark:bg-slate-900/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                        {itemLoading ? (
                                                          <div className="text-[10px] text-indigo-500 animate-pulse text-center">Searching images...</div>
                                                        ) : itemResults.length > 0 ? (
                                                          <div className="flex flex-col">
                                                            <div className="flex justify-between items-center mb-2 px-1">
                                                              <div className="text-[10px] font-medium text-slate-500">Image Results</div>
                                                              <button 
                                                                onClick={(e) => { e.stopPropagation(); setSearchResults(prev => ({...prev, [fullItemKey]: []})); setSearchModes(prev => ({...prev, [fullItemKey]: false})); }}
                                                                className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                              >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                              </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                              {itemResults.map((res: any, sIdx: number) => {
                                                                if (brokenSearchImages[\`\${fullItemKey}-\${sIdx}\`]) return null;
                                                                return (
                                                                  <div 
                                                                    key={sIdx} 
                                                                    className="w-full rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 hover:ring-1 hover:ring-indigo-400 transition-all bg-black/5 flex flex-col"
                                                                    onClick={() => setSearchPreview({ groupKey: fullItemKey, index: sIdx })}
                                                                  >
                                                                    <div className="h-24 sm:h-32 w-full flex-shrink-0">
                                                                      <img 
                                                                        src={res.imageUrl} 
                                                                        alt={res.title} 
                                                                        className="w-full h-full object-cover" 
                                                                        onError={() => setBrokenSearchImages(prev => ({ ...prev, [\`\${fullItemKey}-\${sIdx}\`]: true }))}
                                                                      />
                                                                    </div>
                                                                    <div className="p-1 bg-slate-50 dark:bg-slate-900 text-[9px] truncate text-slate-500 text-center flex-grow flex items-center justify-center">{res.title}</div>
                                                                  </div>
                                                                );
                                                              })}
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="text-[9.5px] text-rose-500 bg-rose-50 p-2 rounded-lg text-center">
                                                            ⚠️ Search Error: {searchErrors[fullItemKey] || "Search API did not return valid items."}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </React.Fragment>
                                                );`;

code = code.replace(mapStart, newMapStart);

// Remove the old render block at the bottom
const oldBottomStart = `                                           {/* Render active search item taking full width below the row */}
                                           {(() => {
                                             const activeItemIdx = (group.items || []).findIndex((item: any, itemIdx: number) => {
                                               return searchModes[\`\${msg.id}-\${idx}-\${itemIdx}\`];
                                             });
                                                
                                             if (activeItemIdx === -1) return <div className="pb-8" />;
                                                
                                             const fullItemKey = \`\${msg.id}-\${idx}-\${activeItemIdx}\`;
                                             const itemResults = searchResults[fullItemKey] || [];
                                             const itemLoading = !!searchLoading[fullItemKey];

                                             return (
                                              <div className="w-full mt-4 pb-8 space-y-2 border-b border-slate-100 dark:border-slate-850 font-sans">
                                                {itemLoading ? (
                                                  <div className="text-[10px] text-indigo-500 animate-pulse text-center">Searching images...</div>
                                                ) : itemResults.length > 0 ? (
                                                  <div className="flex flex-col gap-3">
                                                    {itemResults.map((res: any, sIdx: number) => {
                                                      if (brokenSearchImages[\`\${fullItemKey}-\${sIdx}\`]) return null;
                                                      return (
                                                        <div 
                                                          key={sIdx} 
                                                          className="w-full rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                                                          onClick={() => setSearchPreview({ groupKey: fullItemKey, index: sIdx })}
                                                        >
                                                          <img 
                                                            src={res.imageUrl} 
                                                            alt={res.title} 
                                                            className="w-full h-auto object-contain" 
                                                            onError={() => setBrokenSearchImages(prev => ({ ...prev, [\`\${fullItemKey}-\${sIdx}\`]: true }))}
                                                          />
                                                          <div className="p-1.5 bg-slate-50 dark:bg-slate-900 text-[10px] truncate text-slate-500 text-center">{res.title}</div>
                                                        </div>
                                                      );
                                                    })}
                                                    <div className="flex justify-center mt-2">
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); setSearchResults(prev => ({...prev, [fullItemKey]: []})); setSearchModes(prev => ({...prev, [fullItemKey]: false})); }}
                                                        className="flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shadow-sm"
                                                        title="Clear results"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="text-[9.5px] text-rose-500 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/40 text-center leading-normal font-bold">
                                                    ⚠️ Search Error: {searchErrors[fullItemKey] || "Search API did not return valid items."}
                                                  </div>
                                                )}
                                              </div>
                                             );
                                           })()}`;

code = code.replace(oldBottomStart, "");
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log("Patched rendering successfully!");
