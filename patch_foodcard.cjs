const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const itemWrapperOld = `<div key={itemIdx} className="relative w-full flex flex-col gap-2">`;
const itemWrapperNew = `<div key={itemIdx} className="relative flex flex-col gap-2 flex-grow-0 max-w-[48%] sm:max-w-[32%] md:max-w-[24%]">`;

const chipContentOld = `const chipContent = isTextOnly ? (
                                                  <div 
                                                    className={\`flex items-center justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[48px] w-full \${`;
const chipContentNew = `const chipContent = isTextOnly ? (
                                                  <div 
                                                    className={\`flex items-center justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[48px] px-3 w-full \${`;

const chipOnClickOld = `const chipOnClick = (fetchedUrl?: string) => {
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
                                                };`;

const chipOnClickNew = `const chipOnClick = (fetchedUrl?: string) => {
                                                  if (isSelectingMode) {
                                                    setSelectedItemKeys(prev => 
                                                      prev.includes(itemKey) 
                                                        ? prev.filter(k => k !== itemKey) 
                                                        : [...prev, itemKey]
                                                    );
                                                  } else {
                                                    if (isTextOnly) {
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
                                                        handleFoodSearch(idx, itemIdx, itemDisplayName);
                                                      }
                                                    } else {
                                                      setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc, overrideSrc: fetchedUrl && typeof fetchedUrl === 'string' ? fetchedUrl : undefined });
                                                    }
                                                  }
                                                };`;

code = code.replace(itemWrapperOld, itemWrapperNew);
code = code.replace(chipContentOld, chipContentNew);
code = code.replace(chipOnClickOld, chipOnClickNew);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log("Patched FoodCard basics!");
