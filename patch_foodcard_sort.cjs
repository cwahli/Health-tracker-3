const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const targetStr = `const nutrientRows = food.keyNutrients 
                            ? Object.entries(food.keyNutrients)
                                .filter(([k,v]) => k !== 'calories' && v !== null && v !== undefined)
                                .map(([k,v]) => {
                                  const vals: any[] = [];
                                  vals[idx] = v;
                                  return { nutrient: k, values: vals };
                                }).slice(0, 6)`;

const concernStr = `const concern = (msg.data?.agentResult.comparison.keyNutrientConcern || '').toLowerCase();`;

const newCode = `${concernStr}
                          const nutrientRows = food.keyNutrients 
                            ? Object.entries(food.keyNutrients)
                                .filter(([k,v]) => k !== 'calories' && v !== null && v !== undefined)
                                .sort((a, b) => {
                                  const aMatch = concern.includes(a[0].toLowerCase().replace('total', '').trim()) || (a[0].toLowerCase() === 'sodium' && concern.includes('sodium')) || (a[0].toLowerCase() === 'saturatedfat' && concern.includes('sat'));
                                  const bMatch = concern.includes(b[0].toLowerCase().replace('total', '').trim()) || (b[0].toLowerCase() === 'sodium' && concern.includes('sodium')) || (b[0].toLowerCase() === 'saturatedfat' && concern.includes('sat'));
                                  if (aMatch && !bMatch) return -1;
                                  if (!aMatch && bMatch) return 1;
                                  return 0;
                                })
                                .map(([k,v]) => {
                                  const vals: any[] = [];
                                  vals[idx] = v;
                                  return { nutrient: k, values: vals };
                                }).slice(0, 6)`;

code = code.replace(targetStr, newCode);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard patched');
