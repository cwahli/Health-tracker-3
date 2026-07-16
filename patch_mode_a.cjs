const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const modeAOld = `                              <span className="text-[10.5px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                                🔍 Visual Scout Identified
                              </span>
                              {msg.data?.pendingFoodLog?.scoutConfidenceRating && (
                                <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${
                                  (() => {
                                    const c = msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase();
                                    if (c.includes('low')) return 'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400';
                                    if (c.includes('medium')) return 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400';
                                    return 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400';
                                  })()
                                }\`}>
                                  Confidence: {msg.data.pendingFoodLog.scoutConfidenceRating}
                                </span>
                              )}`;

const modeANew = `                              <div className="flex items-center gap-2">
                                <span className="text-[10.5px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                                  🔍 Meal composition
                                </span>
                                {activeScoutItems.some((i: any) => i.originalName && i.originalName.toLowerCase() !== (i.keyword || "").toLowerCase()) && (
                                 <button
                                   type="button"
                                   onClick={() => setShowTranslations(prev => ({ ...prev, scout: !prev.scout }))}
                                   className={\`p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md transition-all cursor-pointer \${
                                     showTranslations.scout ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                   }\`}
                                   title="Toggle Language"
                                 >
                                   <span className="text-[9px] font-bold leading-none block px-0.5 py-[1px]">{showTranslations.scout ? "English" : "Local"}</span>
                                 </button>
                                )}
                              </div>
                              {msg.data?.pendingFoodLog?.scoutConfidenceRating && !msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase().includes('high') && (
                                <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${
                                  msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase().includes('low') 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400'
                                }\`}>
                                  Confidence: {msg.data.pendingFoodLog.scoutConfidenceRating}
                                </span>
                              )}`;

if (code.includes(modeAOld)) {
  code = code.replace(modeAOld, modeANew);
  console.log("Success patch mode A");
} else {
  console.log("Failed patch mode A");
}
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
