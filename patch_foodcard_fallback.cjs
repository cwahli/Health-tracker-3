const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const replacement = `                                {(() => {
                                  let groupScoutItems = (group.scoutItemIndices && group.scoutItemIndices.length > 0)
                                    ? group.scoutItemIndices.map((i: number) => activeScoutItems[i]).filter(Boolean)
                                    : [];
                                  
                                  if (groupScoutItems.length === 0 && group.items && group.items.length > 0) {
                                    groupScoutItems = activeScoutItems.filter(s => {
                                      return group.items.some((gi: any) => 
                                        gi.name === s.keyword || 
                                        gi.name === s.originalName ||
                                        (gi.name && s.keyword && gi.name.toLowerCase().includes(s.keyword.toLowerCase()))
                                      );
                                    });
                                  }
                                    
                                  if (groupScoutItems.length > 0) {
                                    return <NutritionLabelTable activeScoutItems={groupScoutItems} />;
                                  }`;

content = content.replace(/\{\(\(\) => \{\s*const groupScoutItems = \(group\.scoutItemIndices && group\.scoutItemIndices\.length > 0\)\s*\? group\.scoutItemIndices\.map\(\(i: number\) => activeScoutItems\[i\]\)\.filter\(Boolean\)\s*: \[\];\s*if \(groupScoutItems\.length > 0\) \{\s*return <NutritionLabelTable activeScoutItems=\{groupScoutItems\} \/>;\s*\}/, replacement);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', content);
console.log("Replaced with regex");
