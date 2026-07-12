import React from 'react';

interface FoodEvaluationComparisonCardProps {
  msg: any;
  currentFormat: string;
}

export const FoodEvaluationComparisonCard: React.FC<FoodEvaluationComparisonCardProps> = ({ msg, currentFormat }) => {
  if (!msg.agentResult || msg.agentResult.mode !== 'evaluation' || !msg.agentResult.comparison) return null;

  if (currentFormat === 'card') {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words flex flex-wrap items-center gap-1.5 w-full">
            <span className="shrink-0">⚖️ Comparison:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold break-words">{msg.agentResult.comparison.keyNutrientConcern || 'Nutrients of Concern'}</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {(msg.agentResult.comparison.foods || []).map((food: any, idx: number) => {
            const suitabilityColors: any = {
              good: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40",
              moderate: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40",
              bad: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/40",
            };
            const suitabilityClass = suitabilityColors[food.suitability] || "bg-slate-50 dark:bg-slate-900 text-slate-700 border-slate-100";
            return (
              <div key={idx} className="border border-slate-200 dark:border-slate-700/30 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{food.name}</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400 font-bold">{food.weightGrams}g</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400 font-semibold">
                    <div className="flex justify-between">
                      <span>Calories:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-200">{food.calories} kcal</span>
                    </div>
                    {food.saturatedFat !== undefined && (
                      <div className="flex justify-between">
                        <span>Saturated Fat:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-200">{food.saturatedFat}g</span>
                      </div>
                    )}
                    {food.sodium !== undefined && (
                      <div className="flex justify-between">
                        <span>Sodium:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-200">{food.sodium}mg</span>
                      </div>
                    )}
                    {food.sugar !== undefined && (
                      <div className="flex justify-between">
                        <span>Sugar:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-200">{food.sugar}g</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className={`text-[10px] px-2 py-1 rounded-lg border font-bold text-center ${suitabilityClass}`}>
                    Suitability: {String(food.suitability).toUpperCase()}
                  </div>
                  {food.pros && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                      <strong className="text-emerald-600 dark:text-emerald-400">✓ Pros:</strong> {food.pros}
                    </p>
                  )}
                  {food.cons && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                      <strong className="text-rose-500 dark:text-rose-400">✗ Cons:</strong> {food.cons}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (currentFormat === 'table') {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden">
        {/* Key Nutrient Comparison Table */}
        {(msg.agentResult.comparison.comparisonTableYaml || msg.agentResult.comparison.comparisonTableMarkdown) && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10 mt-2">
            <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                📊 Side-by-Side Comparison Matrix
              </span>
            </div>
            {msg.agentResult.comparison.comparisonTableYaml ? (
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      {msg.agentResult.comparison.comparisonTableYaml.columns?.map((col: string, idx: number) => (
                        <th key={idx} className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {msg.agentResult.comparison.comparisonTableYaml.rows?.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">{row.nutrient}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{row.foodA}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{row.foodB}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold">{row.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 text-[11px] prose dark:prose-invert prose-p:leading-relaxed prose-pre:m-0 prose-pre:bg-transparent overflow-x-auto max-w-none text-slate-700 dark:text-slate-300">
                {msg.agentResult.comparison.comparisonTableMarkdown}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};
