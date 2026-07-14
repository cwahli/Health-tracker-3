const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const replacement = `
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onLogFood) {
                                      const mappedLog = {
                                        id: 'food_' + Date.now(),
                                        date: new Date().toISOString().split('T')[0],
                                        name: food.name,
                                        weightGrams: Number(String(weight).replace(/[^0-9.]/g, '')) || 100,
                                        composition: food.name,
                                        imageUrl: resolvedImgSrc,
                                        imageUrls: messageImages,
                                        nutrients: {
                                          calories: Number(String(calories).replace(/[^0-9.]/g, '')) || 0,
                                          saturatedFat: food.keyNutrients?.saturatedFat || food.keyNutrients?.saturatedfat || 0,
                                          sodium: food.keyNutrients?.sodium || 0,
                                          protein: food.keyNutrients?.protein || 0,
                                          carbohydrates: food.keyNutrients?.carbohydrates || 0,
                                          totalFat: food.keyNutrients?.totalFat || food.keyNutrients?.totalfat || 0,
                                        },
                                        itemsBreakdown: [
                                          {
                                            name: food.name,
                                            weightGrams: Number(String(weight).replace(/[^0-9.]/g, '')) || 100,
                                            calories: Number(String(calories).replace(/[^0-9.]/g, '')) || 0,
                                            saturatedFat: food.keyNutrients?.saturatedFat || food.keyNutrients?.saturatedfat || 0,
                                            sodium: food.keyNutrients?.sodium || 0
                                          }
                                        ]
                                      };
                                      onLogFood(mappedLog);
                                      if (setLoggedMessageIds) setLoggedMessageIds(prev => [...prev, msg.id]);
                                    }
                                  }}
                                  className="mt-3 w-full px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                >
                                  <span>+ Log this item</span>
                                </button>
                              </div>
                            </React.Fragment>
`;

code = code.replace(/<\/div>\s*<\/div>\s*<\/React\.Fragment>/, replacement);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard log button added');
