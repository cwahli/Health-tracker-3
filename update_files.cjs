const fs = require('fs');

// STEP 2 & 3: Update FoodCard.tsx
let foodCard = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

foodCard = foodCard.replace(
  "import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2, Eye } from 'lucide-react';",
  "import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2, Eye, Camera } from 'lucide-react';"
);

foodCard = foodCard.replace(
  "  const [showTranslations, setShowTranslations] = React.useState<Record<string, boolean>>({});\n\n  const activeScoutItems = React.useMemo(() => {",
  "  const [showTranslations, setShowTranslations] = React.useState<Record<string, boolean>>({});\n  const [warningsDismissed, setWarningsDismissed] = React.useState(false);\n\n  const activeScoutItems = React.useMemo(() => {"
);

const oldWarningBlock = `
                             {/* Uncertain Items Helper Button */}
                             {activeScoutItems.some((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0)) && (
                               <div className="mt-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-2 font-sans">
                                 <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                   <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                   <span className="text-[10px] font-medium leading-tight">Some items are unclear or obscured.</span>
                                 </div>
                                 <button 
                                   onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                                   className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all w-full text-center"
                                 >
                                   Type correction or upload new photo
                                 </button>
                               </div>
                             )}
`;

const newWarningBlock = `
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
                                         <Camera className="w-3.5 h-3.5" />
                                         <Search className="w-3.5 h-3.5" />
                                         Update
                                       </button>
                                     </div>
                                   </div>
                                 );
                               })()
                             )}
`;

foodCard = foodCard.replace(oldWarningBlock.trim(), newWarningBlock.trim());
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', foodCard);
console.log('FoodCard.tsx updated successfully.');

// STEP 4: Rewrite NutritionLabelTable.tsx
const nutritionLabelTable = `import React from 'react';
import { Camera, Search } from 'lucide-react';

export function NutritionLabelTable({ activeScoutItems }: { activeScoutItems: any[] }) {
  if (!activeScoutItems?.length) return null;
  const hasLabels = activeScoutItems.some(
    (i: any) =>
      (i.nutritionFacts && Object.keys(i.nutritionFacts).length > 0) ||
      (i.rawNutritionLabel && Object.keys(i.rawNutritionLabel).length > 0)
  );

  if (!hasLabels) return null;

  return (
    <div className="mt-2 text-left pt-1 font-sans">
      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-indigo-600 dark:text-indigo-400 select-none">
          <span>View Nutrition Labels</span>
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-2 space-y-3 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/30">
          {activeScoutItems.map((item: any, i: number) => {
            const hasRaw = item.rawNutritionLabel && Object.keys(item.rawNutritionLabel).length > 0;
            const hasNut = item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0;
            if (!hasRaw && !hasNut) return null;

            const missingWeight = !item.estimatedWeightGrams || isNaN(Number(item.estimatedWeightGrams));

            // Merge keys for table
            const allKeys = Array.from(
              new Set([
                ...(hasRaw ? Object.keys(item.rawNutritionLabel) : []),
                ...(hasNut ? Object.keys(item.nutritionFacts) : []),
              ])
            ).filter((k) => k !== 'servingSize' && k !== 'weight' && k !== 'servingsPerContainer');

            return (
              <div
                key={\`nut-\${i}\`}
                className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
              >
                <strong className="block text-slate-800 dark:text-slate-200 mb-2 font-display text-xs">
                  {item.originalName || item.keyword}
                </strong>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 font-normal">Weight:</span>{' '}
                    {missingWeight ? <span className="text-amber-500 font-bold">Unknown</span> : \`\${item.estimatedWeightGrams}g\`}
                  </div>
                  {(item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize) && (
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 font-normal">Serving Size:</span>{' '}
                      {item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize}
                    </div>
                  )}
                </div>

                {missingWeight && (
                  <div className="mb-3 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <span className="font-medium">Missing portion size to calculate total nutrients.</span>
                    </div>
                    <button 
                      onClick={() => { document.getElementById('food-chat-input')?.focus(); }}
                      className="flex items-center gap-1 font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1 px-2 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all"
                    >
                      <Camera className="w-3 h-3" />
                      <Search className="w-3 h-3" />
                      Update
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Nutrient
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Original Label
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 whitespace-nowrap">
                          Total {missingWeight ? '(N/A)' : \`(\${item.estimatedWeightGrams}g)\`}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {allKeys.map((k) => {
                        const originalVal = item.rawNutritionLabel?.[k] !== undefined 
                          ? item.rawNutritionLabel?.[k] 
                          : item.nutritionFacts?.[k];
                          
                        let numVal = null;
                        if (originalVal !== undefined && originalVal !== null) {
                          const match = String(originalVal).match(/[\\d.]+/);
                          if (match) numVal = parseFloat(match[0]);
                        }
                        
                        let totalStr = '-';
                        if (numVal !== null && !missingWeight) {
                          let multiplier = 1;
                          const wasFromRaw = item.rawNutritionLabel?.[k] !== undefined;
                          
                          if (wasFromRaw && item.rawNutritionLabel?.servingSize) {
                             const ssMatch = String(item.rawNutritionLabel.servingSize).match(/[\\d.]+/);
                             if (ssMatch) {
                               multiplier = item.estimatedWeightGrams / parseFloat(ssMatch[0]);
                             } else {
                               multiplier = item.estimatedWeightGrams / 100;
                             }
                          } else {
                             multiplier = item.estimatedWeightGrams / 100;
                          }
                          
                          const total = (numVal * multiplier).toFixed(1).replace(/\\.0$/, '');
                          const unit = String(originalVal).replace(/[\\d.\\s]/g, '') || (k.toLowerCase().includes('calories') ? 'kcal' : 'g');
                          totalStr = \`\${total}\${unit}\`;
                        }

                        return (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                              {originalVal !== undefined && originalVal !== null ? String(originalVal) : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-indigo-600 dark:text-indigo-400 font-bold">
                              {totalStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
`;

fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', nutritionLabelTable);
console.log('NutritionLabelTable.tsx updated successfully.');
