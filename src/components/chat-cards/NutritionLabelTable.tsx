import React from 'react';
import { Camera, Search } from 'lucide-react';
import { nutrientDefinitions } from '../../utils/nutrition';

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

            const isUnclear = item.itemConfidence?.toLowerCase().includes('low') || 
                              item.itemConfidence?.toLowerCase().includes('medium') || 
                              (item.anomalyFlags && item.anomalyFlags.length > 0);
            const showWarning = missingWeight || isUnclear;

            // Merge keys for table
            const allKeys = Array.from(
              new Set([
                ...(hasRaw ? Object.keys(item.rawNutritionLabel) : []),
                ...(hasNut ? Object.keys(item.nutritionFacts) : []),
              ])
            ).filter((k) => {
              if (k === 'servingSize' || k === 'weight' || k === 'servingsPerContainer') return false;
              const val = item.rawNutritionLabel?.[k] !== undefined 
                ? item.rawNutritionLabel?.[k] 
                : item.nutritionFacts?.[k];
              return val !== undefined && val !== null && val !== '' && val !== '-' && val !== '--';
            });

            return (
              <div
                key={`nut-${i}`}
                className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
              >
                <strong className="block text-slate-800 dark:text-slate-200 mb-2 font-display text-xs">
                  {item.originalName || item.keyword}
                </strong>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 font-normal">Weight:</span>{' '}
                    {missingWeight ? <span className="text-amber-500 font-bold">Unknown</span> : `${item.estimatedWeightGrams}g`}
                  </div>
                  {(item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize) && (
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 font-normal">Serving Size:</span>{' '}
                      {item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize}
                    </div>
                  )}
                </div>

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
                          Total value {missingWeight ? '(N/A)' : `(${item.estimatedWeightGrams}g)`}
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
                          const match = String(originalVal).match(/[\d.]+/);
                          if (match) numVal = parseFloat(match[0]);
                        }
                        
                        let totalStr = '-';
                        if (numVal !== null && !missingWeight) {
                          let multiplier = 1;
                          const wasFromRaw = item.rawNutritionLabel?.[k] !== undefined;
                          
                          if (wasFromRaw && item.rawNutritionLabel?.servingSize) {
                             const ssMatch = String(item.rawNutritionLabel.servingSize).match(/[\d.]+/);
                             if (ssMatch) {
                               multiplier = item.estimatedWeightGrams / parseFloat(ssMatch[0]);
                             } else {
                               multiplier = item.estimatedWeightGrams / 100;
                             }
                          } else {
                             multiplier = item.estimatedWeightGrams / 100;
                          }
                          
                          const total = (numVal * multiplier).toFixed(1).replace(/\.0$/, '');
                          const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                          const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                          const unit = String(originalVal).replace(/[\d.\s]/g, '') || defaultUnit;
                          totalStr = `${total}${unit}`;
                        }

                        let originalDisplay = '-';
                        if (originalVal !== undefined && originalVal !== null) {
                          const hasUnit = /[a-zA-Z%]/.test(String(originalVal));
                          if (hasUnit) {
                            originalDisplay = String(originalVal);
                          } else {
                            const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                            const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                            originalDisplay = `${originalVal}${defaultUnit}`;
                          }
                        }

                        return (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                              {originalDisplay}
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

                {showWarning && (
                  <div className="mt-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-2 font-sans">
                    <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold leading-tight">
                          {missingWeight ? "Missing portion size to calculate total nutrients." : "Visual scout flagged this item as unclear."}
                        </span>
                        <span className="text-[10px] font-medium leading-tight opacity-90 mt-0.5">
                          {isUnclear 
                            ? `Low confidence or anomalies detected (${item.anomalyFlags?.join(', ') || 'unclear detail'}).` 
                            : "Provide a portion size or weight so the total nutrients can be computed."}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
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
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
