import React from 'react';

interface FoodEvaluationComparisonCardProps {
  msg: any;
}

export const FoodEvaluationComparisonCard: React.FC<FoodEvaluationComparisonCardProps> = ({ msg }) => {
  if (!msg.agentResult || msg.agentResult.mode !== 'evaluation' || !msg.agentResult.comparison) return null;

  return (
    <>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words flex flex-wrap items-center gap-1.5 w-full">
            <span className="shrink-0">⚖️ Comparison:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold break-words">{msg.agentResult.comparison.keyNutrientConcern || 'Nutrients of Concern'}</span>
          </h4>
        </div>
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
                        {row.values?.map((val: string, vIdx: number) => (
                          <td key={vIdx} className="px-3 py-2 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{val}</td>
                        ))}
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
    </>
  );
};
