const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/NutritionLabelTable.tsx', 'utf8');

// Update props to accept onConfirmItem
content = content.replace(
  `export const NutritionLabelTable = ({ activeScoutItems }: { activeScoutItems: any[] }) => {`,
  `export const NutritionLabelTable = ({ activeScoutItems, onConfirmItem }: { activeScoutItems: any[], onConfirmItem?: (idx: number) => void }) => {`
);

const warningSection = `                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        Correct Item
                      </button>
                      <button 
                        onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        Upload New Photo
                      </button>
                    </div>`;

const newWarningSection = `                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        Correct Item
                      </button>
                      <button 
                        onClick={() => { 
                          if (onConfirmItem) {
                            onConfirmItem(item.scoutIndex ?? i);
                          }
                        }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        This is correct
                      </button>
                    </div>`;

if (content.includes(warningSection)) {
  content = content.replace(warningSection, newWarningSection);
  console.log("Patched warning buttons in NutritionLabelTable!");
} else {
  console.log("Warning buttons not found in NutritionLabelTable!");
}

const preservedFlagsSection = `                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};`;

const newPreservedFlagsSection = `                )}
                {item._preservedAnomalyFlags && item._preservedAnomalyFlags.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-sans px-1">
                    Note: {item._preservedAnomalyFlags.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};`;

if (content.includes(preservedFlagsSection)) {
  content = content.replace(preservedFlagsSection, newPreservedFlagsSection);
  console.log("Patched preserved anomaly flags in NutritionLabelTable!");
} else {
  console.log("Preserved flags section not found in NutritionLabelTable!");
}

fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', content);
