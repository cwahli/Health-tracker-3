const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const targetMemo = `  const activeScoutItems = React.useMemo(() => {
    if (msg.data?.agentResult?.scoutData?.items && Array.isArray(msg.data.agentResult.scoutData.items)) return msg.data.agentResult.scoutData.items;
    if (msg.data?.scoutData?.items && Array.isArray(msg.data.scoutData.items)) return msg.data.scoutData.items;
    if (msg.data?.scoutItems && msg.data.scoutItems.length > 0) return msg.data.scoutItems;
    for (let mIdx = (messages ? messages.length - 1 : -1); mIdx >= 0; mIdx--) {
      if (messages[mIdx].data?.scoutItems && messages[mIdx].data.scoutItems.length > 0) return messages[mIdx].data.scoutItems;
    }
    return [];
  }, [msg.data, messages]);`;

const replacementMemo = `  const [confirmedScoutIndices, setConfirmedScoutIndices] = React.useState<Set<number>>(new Set());

  const activeScoutItems = React.useMemo(() => {
    let items = [];
    if (msg.data?.agentResult?.scoutData?.items && Array.isArray(msg.data.agentResult.scoutData.items)) items = msg.data.agentResult.scoutData.items;
    else if (msg.data?.scoutData?.items && Array.isArray(msg.data.scoutData.items)) items = msg.data.scoutData.items;
    else if (msg.data?.scoutItems && msg.data.scoutItems.length > 0) items = msg.data.scoutItems;
    else {
      for (let mIdx = (messages ? messages.length - 1 : -1); mIdx >= 0; mIdx--) {
        if (messages[mIdx].data?.scoutItems && messages[mIdx].data.scoutItems.length > 0) {
          items = messages[mIdx].data.scoutItems;
          break;
        }
      }
    }
    
    if (confirmedScoutIndices.size > 0) {
      return items.map((item: any, i: number) => {
        if (confirmedScoutIndices.has(i) || confirmedScoutIndices.has(item.scoutIndex)) {
          return {
            ...item,
            itemConfidence: 'High',
            _preservedAnomalyFlags: item.anomalyFlags,
            anomalyFlags: []
          };
        }
        return item;
      });
    }
    
    return items;
  }, [msg.data, messages, confirmedScoutIndices]);`;

if (content.includes(targetMemo)) {
  content = content.replace(targetMemo, replacementMemo);
  console.log("Patched activeScoutItems memo!");
} else {
  console.log("Memo target not found!");
}

// Find <NutritionLabelTable activeScoutItems={groupScoutItems} />
const tableTarget1 = `<NutritionLabelTable activeScoutItems={groupScoutItems} />`;
const tableRep1 = `<NutritionLabelTable activeScoutItems={groupScoutItems} onConfirmItem={(idx) => setConfirmedScoutIndices(prev => new Set(prev).add(idx))} />`;
if (content.includes(tableTarget1)) {
    content = content.replace(tableTarget1, tableRep1);
}

// Find <NutritionLabelTable activeScoutItems={activeScoutItems} />
const tableTarget2 = `<NutritionLabelTable activeScoutItems={activeScoutItems} />`;
const tableRep2 = `<NutritionLabelTable activeScoutItems={activeScoutItems} onConfirmItem={(idx) => setConfirmedScoutIndices(prev => new Set(prev).add(idx))} />`;
if (content.includes(tableTarget2)) {
    content = content.replace(tableTarget2, tableRep2);
}

// Replace warning buttons in FoodCard
const warningTarget = `<button 
                                     onClick={() => { fileInputRef?.current?.click(); }} 
                                     className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                   >
                                     Upload New Photo
                                   </button>`;

const warningRep = `<button 
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

if (content.includes(warningTarget)) {
    content = content.replace(warningTarget, warningRep);
    console.log("Patched warning buttons in FoodCard!");
}

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', content);
