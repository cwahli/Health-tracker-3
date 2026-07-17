import React from 'react';

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

            // Merge keys for table
            const allKeys = Array.from(
              new Set([
                ...(hasRaw ? Object.keys(item.rawNutritionLabel) : []),
                ...(hasNut ? Object.keys(item.nutritionFacts) : []),
              ])
            ).filter((k) => k !== 'servingSize' && k !== 'weight');

            return (
              <div
                key={`nut-${i}`}
                className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
              >
                <strong className="block text-slate-800 dark:text-slate-200 mb-2 font-display text-xs">
                  {item.originalName || item.keyword}
                </strong>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
                  {(item.rawNutritionLabel?.weight || item.nutritionFacts?.weight) && (
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 font-normal">Weight:</span>{' '}
                      {item.rawNutritionLabel?.weight || item.nutritionFacts?.weight}
                    </div>
                  )}
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
                        {hasRaw && (
                          <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                            Raw Label
                          </th>
                        )}
                        {hasNut && (
                          <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                            Per 100g
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {allKeys.map((k) => (
                        <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          {hasRaw && (
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                              {item.rawNutritionLabel?.[k] !== undefined && item.rawNutritionLabel?.[k] !== null
                                ? String(item.rawNutritionLabel?.[k])
                                : '-'}
                            </td>
                          )}
                          {hasNut && (
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                              {item.nutritionFacts?.[k] !== undefined && item.nutritionFacts?.[k] !== null
                                ? String(item.nutritionFacts?.[k])
                                : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
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
