const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const target = `<button 
                                   onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                                   className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                 >
                                   Upload New Photo
                                 </button>`;

const replacement = `<button 
                                   onClick={() => { 
                                      const idx = activeScoutItems[0]?.scoutIndex ?? 0;
                                      setConfirmedScoutIndices(prev => new Set([...prev, idx]));
                                   }} 
                                   className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                 >
                                   This is correct
                                 </button>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log("Patched single item mode buttons!");
    fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', content);
} else {
    console.log("Not found!");
}
