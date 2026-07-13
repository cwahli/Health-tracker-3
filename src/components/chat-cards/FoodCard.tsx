import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import { NutrientPieChart } from '../NutrientPieChart';

import { nutrientDefinitions } from '../../utils/nutrition';
import { FoodLog } from '../../types';

export const FoodCard: React.FC<AgentCardProps> = ({
  msg, currentFormat, report, foodLogs, t, formatNutrientValue,
  onLogFood, setLoggedMessageIds, loggedMessageIds, profile
}) => {
  const [expandedTables, setExpandedTables] = React.useState<Record<string, boolean>>({});
  if (msg.agentType !== 'food') return null;
  return (
    <>
      {msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'card' && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words flex flex-wrap items-center gap-1.5 w-full">
                          <span className="shrink-0">⚖️ Comparison:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold break-words">{msg.data?.agentResult.comparison.keyNutrientConcern || 'Nutrients of Concern'}</span>
                        </h4>
                      </div>

                      {/* Foods Comparison Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {(msg.data?.agentResult.comparison.foods || []).map((food: any, idx: number) => {
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
                  )}

                  {msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && currentFormat === 'table' && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden">
                      {/* Key Nutrient Comparison Table */}
                      {(msg.data?.agentResult.comparison.comparisonTableYaml || msg.data?.agentResult.comparison.comparisonTableMarkdown) && (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10 mt-2">
                          <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              📊 Side-by-Side Comparison Matrix
                            </span>
                          </div>
                          {msg.data?.agentResult.comparison.comparisonTableYaml ? (
                            <div className="p-0 overflow-x-auto">
                              <table className="w-full text-[11px] text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    {msg.data?.agentResult.comparison.comparisonTableYaml.columns?.map((col: string, idx: number) => (
                                      <th key={idx} className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {msg.data?.agentResult.comparison.comparisonTableYaml.rows?.map((row: any, idx: number) => (
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
                            <div className="p-3 text-[11px] overflow-x-auto font-mono text-slate-700 dark:text-slate-300 whitespace-pre leading-relaxed">
                              {msg.data?.agentResult.comparison.comparisonTableMarkdown}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.data?.pendingFoodLog && currentFormat === 'card' && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden font-sans">
                      {msg.data?.pendingFoodLog.imageUrls && msg.data?.pendingFoodLog.imageUrls.length > 0 && (
                        <div className="overflow-hidden border-y sm:border border-slate-100 dark:border-slate-700/50 shadow-sm mb-3 w-[calc(100%+2rem)] -mx-4 sm:mx-0 sm:w-full sm:rounded-2xl">
                          <ImageSlider images={msg.data?.pendingFoodLog.imageUrls} altText={msg.data?.pendingFoodLog.name || "Pending meal"} />
                        </div>
                      )}
                      
                      {/* Unified display of agent detailed clinical prose inside the card */}
                      {msg.content && (
                        <div className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 leading-relaxed whitespace-pre-line mb-3 font-sans text-left">
                          {msg.content}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2 text-left">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate min-w-0 font-display">
                          {msg.data?.pendingFoodLog.name}
                        </h4>
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 font-sans">
                          {msg.data?.pendingFoodLog.weightGrams}g ({msg.data?.pendingFoodLog.quantity})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium border-b border-slate-100 dark:border-slate-800/50 pb-2 font-sans">
                        <span className="text-slate-500">Record Date:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{msg.data?.pendingFoodLog.date}</span>
                      </div>

                      <div className="text-xs space-y-2 text-slate-600 dark:text-slate-350 font-medium text-left font-sans">
                        <p><strong>{t.composition}:</strong> {msg.data?.pendingFoodLog.composition}</p>
                        <p className="text-slate-700 dark:text-slate-200"><strong>{t.benefits}:</strong> {msg.data?.pendingFoodLog.benefits}</p>
                        {msg.data?.pendingFoodLog.risks && <p className="text-slate-700 dark:text-slate-200"><strong>{t.risks}:</strong> {msg.data?.pendingFoodLog.risks}</p>}
                        <p><strong>{t.impact}:</strong> {msg.data?.pendingFoodLog.healthImpact}</p>
                      </div>

                      {/* Top Nutrients badges */}
                      {(() => {
                        const parseTarget = (val: any, fallback: number) => {
                          if (val === null || val === undefined) return fallback;
                          const cleanStr = String(val).replace(/,/g, '');
                          const matches = cleanStr.match(/\d+(\.\d+)?/g);
                          if (!matches || matches.length === 0) return fallback;
                          const parsed = parseFloat(matches[0]);
                          return isNaN(parsed) ? fallback : parsed;
                        };

                        const caloriesTarget = report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.calories, 1700) : 1800;
                        const satFatTarget = report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.saturatedFat, 15) : 15;
                        const sodiumTarget = report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.sodium, 1200) : 1200;

                        const logDate = msg.data?.pendingFoodLog.date;
                        const dayLogs = foodLogs ? foodLogs.filter(f => f.date === logDate) : [];

                        const caloriesConsumedToday = dayLogs.reduce((acc, curr) => acc + (curr.nutrients?.calories || 0), 0);
                        const satFatConsumedToday = dayLogs.reduce((acc, curr) => acc + (curr.nutrients?.saturatedFat || 0), 0);
                        const sodiumConsumedToday = dayLogs.reduce((acc, curr) => acc + (curr.nutrients?.sodium || 0), 0);

                        const caloriesInMeal = (msg.data?.pendingFoodLog.nutrients && msg.data?.pendingFoodLog.nutrients.calories) || 0;
                        const satFatInMeal = (msg.data?.pendingFoodLog.nutrients && msg.data?.pendingFoodLog.nutrients.saturatedFat) || 0;
                        const sodiumInMeal = (msg.data?.pendingFoodLog.nutrients && msg.data?.pendingFoodLog.nutrients.sodium) || 0;

                        return (
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <div className="flex items-center gap-1.5">
                              <NutrientPieChart
                                allowance={caloriesTarget}
                                alreadyConsumed={caloriesConsumedToday}
                                mealValue={caloriesInMeal}
                                nutrientKey="calories"
                                size="sm"
                              />
                              <span className="text-[11px] font-extrabold" style={{ color: 'rgb(249, 115, 22)' }}>
                                {formatNutrientValue(caloriesInMeal, 'kcal')}
                              </span>
                            </div>

                            {msg.data?.pendingFoodLog.nutrients && msg.data?.pendingFoodLog.nutrients.saturatedFat !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <NutrientPieChart
                                  allowance={satFatTarget}
                                  alreadyConsumed={satFatConsumedToday}
                                  mealValue={satFatInMeal}
                                  nutrientKey="saturatedFat"
                                  size="sm"
                                />
                                <span className="text-[11px] font-bold" style={{ color: 'rgb(234, 179, 8)' }}>
                                  Sat Fat: {formatNutrientValue(satFatInMeal, 'g')}
                                </span>
                              </div>
                            )}

                            {msg.data?.pendingFoodLog.nutrients && msg.data?.pendingFoodLog.nutrients.sodium !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <NutrientPieChart
                                  allowance={sodiumTarget}
                                  alreadyConsumed={sodiumConsumedToday}
                                  mealValue={sodiumInMeal}
                                  nutrientKey="sodium"
                                  size="sm"
                                />
                                <span className="text-[11px] font-bold" style={{ color: 'rgb(34, 197, 94)' }}>
                                  Sodium: {formatNutrientValue(sodiumInMeal, 'mg')}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Collapsible Detailed Components and Nutrient values lists */}
                      {msg.data?.pendingFoodLog && (
                        <div className="pt-2 border-t border-slate-150 dark:border-slate-800/60 font-sans">
                          <button
                            type="button"
                            onClick={() => setExpandedTables(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1.5 cursor-pointer font-sans"
                          >
                            <span className="flex items-center gap-1.5">
                              📊 Components & Nutrient Details
                            </span>
                            {expandedTables[msg.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          
                          {expandedTables[msg.id] && (
                            <div className="mt-3 space-y-4 shadow-inner bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 animation-fade-in text-left">
                              {/* A. Components breakdown table */}
                              {msg.data?.pendingFoodLog.itemsBreakdown && msg.data?.pendingFoodLog.itemsBreakdown.length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      📊 Component Contribution
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold">
                                          <th className="p-2">Item Name</th>
                                          <th className="p-2 text-right">Weight</th>
                                          <th className="p-2 text-right">Calories</th>
                                          <th className="p-2 text-right">Sat Fat</th>
                                          <th className="p-2 text-right">Sodium</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {msg.data?.pendingFoodLog.itemsBreakdown.map((item: any, itemIdx: number) => (
                                          <tr 
                                            key={itemIdx} 
                                            className="border-b last:border-b-0 border-slate-100 dark:border-slate-850 text-slate-750 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-850/20"
                                          >
                                            <td className="p-2 font-semibold truncate max-w-[120px]" title={item.name}>
                                              {item.name}
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-500">
                                              {formatNutrientValue(item.weightGrams, 'g')}
                                            </td>
                                            <td className="p-2 text-right font-mono text-orange-600 dark:text-orange-400 font-semibold">
                                              {formatNutrientValue(item.calories, 'kcal')}
                                            </td>
                                            <td className="p-2 text-right font-mono text-amber-500 font-semibold">
                                              {formatNutrientValue(item.saturatedFat, 'g')}
                                            </td>
                                            <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                              {formatNutrientValue(item.sodium, 'mg')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* B. Full 31-nutrient table */}
                              <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                                    📋 Comprehensive Nutrient Values (31 Nutrients)
                                  </span>
                                </div>
                                <div className="px-3 py-2 space-y-3 text-[11px] font-mono">
                                  {/* Core Nutrients */}
                                  <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200/50 dark:border-slate-800/50 font-sans text-left">Core Nutrients (11)</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                      {(() => {
                                        const coreKeys = ["calories", "protein", "carbohydrates", "totalFat", "saturatedFat", "transFat", "addedSugar", "sodium", "potassium", "totalFibre", "solubleFibre"];
                                        return nutrientDefinitions
                                          .filter(nut => coreKeys.includes(nut.key))
                                          .map((nut) => {
                                            const val = msg.data?.pendingFoodLog?.nutrients?.[nut.key];
                                            return (
                                              <div key={nut.key} className="flex justify-between py-0.5 text-slate-600 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/30 last:border-b-0 sm:even:border-l sm:even:pl-4">
                                                <span className="text-slate-500 font-sans">{nut.labels[profile?.language || 'en'] || nut.labels.en}:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                  {val !== undefined ? `${val} ${nut.unit}` : `--`}
                                                </span>
                                              </div>
                                            );
                                          });
                                      })()}
                                    </div>
                                  </div>

                                  {/* Additional Nutrients */}
                                  <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200/50 dark:border-slate-800/50 font-sans text-left">Additional Nutrients (20)</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                      {(() => {
                                        const coreKeys = ["calories", "protein", "carbohydrates", "totalFat", "saturatedFat", "transFat", "addedSugar", "sodium", "potassium", "totalFibre", "solubleFibre"];
                                        return nutrientDefinitions
                                          .filter(nut => !coreKeys.includes(nut.key))
                                          .map((nut) => {
                                            const val = msg.data?.pendingFoodLog?.nutrients?.[nut.key];
                                            return (
                                              <div key={nut.key} className="flex justify-between py-0.5 text-slate-600 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800/30 last:border-b-0 sm:even:border-l sm:even:pl-4">
                                                <span className="text-slate-500 font-sans">{nut.labels[profile?.language || 'en'] || nut.labels.en}:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                  {val !== undefined ? `${val} ${nut.unit}` : `--`}
                                                </span>
                                              </div>
                                            );
                                          });
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Log Action Button */}
                      {(loggedMessageIds || []).includes(msg.id) ? (
                        <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animation-fade-in font-sans">
                          <Check className="w-4 h-4" />
                          Saved to History
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.data?.pendingFoodLog && onLogFood) {
                              onLogFood(msg.data?.pendingFoodLog as FoodLog);
                              setLoggedMessageIds?.(prev => [...prev, msg.id]);
                            }
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                        >
                          <Plus className="w-4 h-4" />
                          {t.logThisFood}
                        </button>
                      )}
                    </div>
                  )}
    </>
  );
};
