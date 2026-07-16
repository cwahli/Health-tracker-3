const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const mapBlockOld = `                                           {/* Search results moved to item level */}
                                            <div className={hasDishesImages ? "grid grid-cols-3 sm:grid-cols-4 gap-3 w-full pb-8" : "flex flex-wrap gap-2 w-full pb-8"}>
                                             {(group.items || []).map((item: any, itemIdx: number) => {
                                                const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = groupPreviewItems[itemIdx];
                                                const isTextOnly = textOnlyIndices.includes(itemIdx);
                                                const itemKey = \`\${idx}-\${itemIdx}\`;
                                                const fullItemKey = \`\${msg.id}-\${idx}-\${itemIdx}\`;
                                                const isSelected = selectedItemKeys.includes(itemKey);
                                                const itemDisplayName = showTranslations[groupKey] ? (item.keyword || item.name) : (item.originalName || item.name);
                                                const itemIsSearchActive = !!searchModes[fullItemKey];
                                                const itemResults = searchResults[fullItemKey] || [];
                                                const itemLoading = !!searchLoading[fullItemKey];

                                                const chipOnClick = (fetchedUrl?: string) => {
                                                  if (isSelectingMode) {
                                                    setSelectedItemKeys(prev => 
                                                      prev.includes(itemKey) 
                                                        ? prev.filter(k => k !== itemKey) 
                                                        : [...prev, itemKey]
                                                    );
                                                  } else {
                                                    if (searchResults[fullItemKey]) {
                                                      setSearchModes(prev => {
                                                        const next = { ...prev };
                                                        Object.keys(next).forEach(k => {
                                                          if (k.startsWith(\`\${groupKey}-\`) && k !== fullItemKey) {
                                                            next[k] = false;
                                                          }
                                                        });
                                                        next[fullItemKey] = !prev[fullItemKey];
                                                        return next;
                                                      });
                                                    } else {
                                                      setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc, overrideSrc: fetchedUrl && typeof fetchedUrl === 'string' ? fetchedUrl : undefined });
                                                    }
                                                  }
                                                };

                                                const chipContent = isTextOnly ? (
                                                  <div 
                                                    className={\`flex items-center justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[48px] w-full \${
                                                      isSelected 
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md font-bold scale-[1.02]' 
                                                        : isSelectingMode 
                                                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.01]' 
                                                          : 'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:shadow'
                                                    }\`}
                                                    onClick={() => chipOnClick()}
                                                  >
                                                    <span className={\`text-[10.5px] lowercase font-semibold leading-tight break-words text-center \${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}\`}>
                                                      {itemDisplayName}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <FoodScoutItemPreview
                                                    name={itemDisplayName}
                                                    src={resolvedImgSrc}
                                                    boundingBox={bb}
                                                    imgIdx={imgIdx}
                                                    messageImages={resolvedMessageImages}
                                                    isActive={isSelected}
                                                    isSearchMode={isSelectingMode}
                                                    onClick={chipOnClick}
                                                  />
                                                );

                                                return (
                                                  <div key={itemIdx} className="relative w-full flex flex-col gap-2">
                                                      {chipContent}
                                                      {!!searchResults[fullItemKey] && (
                                                          <button 
                                                            onClick={(e) => { e.stopPropagation(); setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc }); }}
                                                            className="absolute top-2 right-2 p-1.5 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full transition-colors z-10"
                                                            title="View original photo"
                                                          >
                                                            <Eye className="w-3.5 h-3.5" />
                                                          </button>
                                                      )}
                                                    
                                                    {itemIsSearchActive && (
                                                      <div className="w-full space-y-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-850 font-sans">
                                                        {itemLoading ? (
                                                          <div className="text-[10px] text-indigo-500 animate-pulse text-center">Searching images...</div>
                                                        ) : itemResults.length > 0 ? (
                                                          <div className="flex flex-col gap-2">
                                                            {itemResults.map((res, sIdx) => {
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
                                                    )}
                                                  </div>
                                                );
                                              })}
                                           </div>`;

const mapBlockNew = `                                           {/* Search results moved to group level to take full width */}
                                            <div className={hasDishesImages ? "grid grid-cols-3 sm:grid-cols-4 gap-3 w-full" : "flex flex-wrap gap-2 w-full"}>
                                             {(group.items || []).map((item: any, itemIdx: number) => {
                                                const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = groupPreviewItems[itemIdx];
                                                const isTextOnly = textOnlyIndices.includes(itemIdx);
                                                const itemKey = \`\${idx}-\${itemIdx}\`;
                                                const fullItemKey = \`\${msg.id}-\${idx}-\${itemIdx}\`;
                                                const isSelected = selectedItemKeys.includes(itemKey);
                                                const itemDisplayName = showTranslations[groupKey] ? (item.keyword || item.name) : (item.originalName || item.name);

                                                const chipOnClick = (fetchedUrl?: string) => {
                                                  if (isSelectingMode) {
                                                    setSelectedItemKeys(prev => 
                                                      prev.includes(itemKey) 
                                                        ? prev.filter(k => k !== itemKey) 
                                                        : [...prev, itemKey]
                                                    );
                                                  } else {
                                                    if (searchResults[fullItemKey]) {
                                                      setSearchModes(prev => {
                                                        const next = { ...prev };
                                                        Object.keys(next).forEach(k => {
                                                          if (k.startsWith(\`\${groupKey}-\`) && k !== fullItemKey) {
                                                            next[k] = false;
                                                          }
                                                        });
                                                        next[fullItemKey] = !prev[fullItemKey];
                                                        return next;
                                                      });
                                                    } else {
                                                      setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc, overrideSrc: fetchedUrl && typeof fetchedUrl === 'string' ? fetchedUrl : undefined });
                                                    }
                                                  }
                                                };

                                                const chipContent = isTextOnly ? (
                                                  <div 
                                                    className={\`flex items-center justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[48px] w-full \${
                                                      isSelected 
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md font-bold scale-[1.02]' 
                                                        : isSelectingMode 
                                                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.01]' 
                                                          : 'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:shadow'
                                                    }\`}
                                                    onClick={() => chipOnClick()}
                                                  >
                                                    <span className={\`text-[10.5px] lowercase font-semibold leading-tight break-words text-center \${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}\`}>
                                                      {itemDisplayName}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <FoodScoutItemPreview
                                                    name={itemDisplayName}
                                                    src={resolvedImgSrc}
                                                    boundingBox={bb}
                                                    imgIdx={imgIdx}
                                                    messageImages={resolvedMessageImages}
                                                    isActive={isSelected}
                                                    isSearchMode={isSelectingMode}
                                                    onClick={chipOnClick}
                                                  />
                                                );

                                                return (
                                                  <div key={itemIdx} className="relative w-full flex flex-col gap-2">
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
                                                );
                                              })}
                                           </div>

                                           {/* Render active search item taking full width below the row */}
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
                                           })()}
`;

if (code.includes(mapBlockOld)) {
  code = code.replace(mapBlockOld, mapBlockNew);
  console.log("Success patch layout");
} else {
  console.log("Failed patch layout");
}
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
