const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const warningTarget = `<button 
                                     onClick={() => { 
                                       const flaggedItemIdx = activeScoutItems.findIndex((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0));
                                       if (flaggedItemIdx !== -1) {
                                         const targetIdx = activeScoutItems[flaggedItemIdx].scoutIndex ?? flaggedItemIdx;
                                         setConfirmedScoutIndices(prev => new Set(prev).add(targetIdx));
                                       }
                                     }} 
                                     className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                   >
                                     This is correct
                                   </button>`;

const warningRep = `<button 
                                     onClick={() => { 
                                       const flaggedIndices = activeScoutItems
                                         .map((i: any, idx: number) => ({ i, idx }))
                                         .filter(({ i }: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0))
                                         .map(({ i, idx }: any) => i.scoutIndex ?? idx);
                                       setConfirmedScoutIndices(prev => new Set([...prev, ...flaggedIndices]));
                                     }} 
                                     className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                   >
                                     This is correct
                                   </button>`;

if (content.includes(warningTarget)) {
    content = content.replace(warningTarget, warningRep);
    console.log("Patched warning buttons in FoodCard to confirm all!");
    fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', content);
} else {
    console.log("Target not found!");
}
