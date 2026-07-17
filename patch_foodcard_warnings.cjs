const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

if (!code.includes('const [warningsDismissed, setWarningsDismissed] = React.useState(false);')) {
  code = code.replace(
    'const [error, setError] = React.useState<boolean>(false);',
    'const [error, setError] = React.useState<boolean>(false);\n  const [warningsDismissed, setWarningsDismissed] = React.useState(false);'
  );
}

const targetReplacement = `
                             {/* Uncertain Items Helper Button */}
                             {!warningsDismissed && activeScoutItems.some((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0)) && (
                               (() => {
                                 const unclearItems = activeScoutItems.filter((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0));
                                 return (
                                   <div className="mt-2 flex flex-col gap-2 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-3 font-sans">
                                     <div className="flex flex-col gap-1 text-amber-700 dark:text-amber-400">
                                       <div className="flex items-center gap-1.5 font-bold mb-1">
                                         <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                         <span className="text-[11px] leading-tight uppercase tracking-wider">Items in review</span>
                                       </div>
                                       <ul className="list-disc pl-5 text-[10px] space-y-1">
                                         {unclearItems.map((item: any, idx: number) => (
                                           <li key={idx} className="font-medium">
                                             <span className="font-bold text-amber-800 dark:text-amber-300">{item.originalName || item.keyword}</span>
                                             {item.anomalyFlags && item.anomalyFlags.length > 0 && (
                                               <span className="opacity-80 ml-1">({item.anomalyFlags.join(', ')})</span>
                                             )}
                                           </li>
                                         ))}
                                       </ul>
                                     </div>
                                     <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                       <button 
                                         onClick={() => setWarningsDismissed(true)}
                                         className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                       >
                                         <Check className="w-3.5 h-3.5" />
                                         The estimation is correct
                                       </button>
                                       <button 
                                         onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                                         className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all text-center"
                                       >
                                         <Search className="w-3.5 h-3.5" />
                                         Update via Chat
                                       </button>
                                     </div>
                                   </div>
                                 );
                               })()
                             )}`;

code = code.replace(/\{.*?Uncertain Items Helper Button.*?\}[\s\S]*?\)\}/, targetReplacement.trim());

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('Patched warning message and buttons');
