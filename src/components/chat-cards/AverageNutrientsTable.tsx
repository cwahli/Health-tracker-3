import React from 'react';
import { nutrientDefinitions } from '../../utils/nutrition';

export function AverageNutrientsTable({ averageNutrients, profileLanguage }: { averageNutrients: Record<string, any>, profileLanguage: string }) {
  if (!averageNutrients || Object.keys(averageNutrients).length === 0) return null;

  const keysToRender = Object.keys(averageNutrients).filter(
    k => averageNutrients[k] !== undefined && averageNutrients[k] !== null && averageNutrients[k] !== ""
  );

  if (keysToRender.length === 0) return null;

  return (
    <div className="mt-2 text-left pt-1 font-sans">
      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-indigo-600 dark:text-indigo-400 select-none">
          <span>View Average Nutrients</span>
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-2 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/30">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50 mt-1 mb-2">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                  <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">Nutrient</th>
                  <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">Average Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {keysToRender.map((k) => {
                  const v = averageNutrients[k];
                  const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                  const unit = k.toLowerCase() === 'calories' ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                  const label = k.toLowerCase() === 'calories'
                    ? 'Calories'
                    : (nutDef ? (nutDef.labels[profileLanguage] || nutDef.labels.en) : k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
                  return (
                    <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300">{label}</td>
                      <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">
                        {v} {unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
