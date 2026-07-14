const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const replacement = `
                          const concern = (msg.data?.agentResult.comparison.keyNutrientConcern || '').toLowerCase();
                          // Variable for profile's top nutrients to monitor (can be adjusted later)
                          const PROFILE_TOP_NUTRIENTS = ['saturatedfat', 'sodium'];
                          
                          const nutrientRows = food.keyNutrients 
                            ? Object.entries(food.keyNutrients)
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
                            : (yamlTable?.rows || []).filter((row: any) => {
                                const name = String(row.nutrient || '').toLowerCase();
                                return !name.includes('calories') && !name.includes('energy') && !name.includes('pros') && !name.includes('cons') && !name.includes('weight');
                              }).slice(0, 3);
`;

code = code.replace(/const concern = \(msg\.data\?\.agentResult\.comparison\.keyNutrientConcern \|\| ''\)\.toLowerCase\(\);\s*const nutrientRows = food\.keyNutrients[\s\S]*?\}\)\.slice\(0, 6\)\s*:\s*\(yamlTable\?\.rows \|\| \[\]\)\.filter\(\(row: any\) => \{[\s\S]*?\}\)\.slice\(0, 6\);/m, replacement);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard nutrients patched');
