import React from 'react';
import { Camera, Search } from 'lucide-react';
import { nutrientDefinitions } from '../../utils/nutrition';
import { translations } from '../../utils/translations';

function normalizeNutritionKeys(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const normalized: any = {};
  
  // Mapping of variation to standard camelCase keys
  const keyMapping: { [key: string]: string } = {
    'calories': 'calories', 'energy': 'calories', 'energi': 'calories', 'energitotal': 'calories', 'energi total': 'calories',
    'totalfat': 'totalFat', 'lemaktotal': 'totalFat', 'lemak total': 'totalFat',
    'saturatedfat': 'saturatedFat', 'lemakjenuh': 'saturatedFat', 'lemak jenuh': 'saturatedFat',
    'saturatedfatenergy': 'saturatedFatEnergy', 'energidarilemakjenuh': 'saturatedFatEnergy',
    'energyfromfat': 'energyFromFat', 'energidarilemak': 'energyFromFat',
    'totalcarbohydrate': 'totalCarbohydrate', 'totalcarbs': 'totalCarbohydrate', 'karbohidrat': 'totalCarbohydrate', 'karbohidrattotal': 'totalCarbohydrate', 'karbohidrat total': 'totalCarbohydrate',
    'sugar': 'sugar', 'gula': 'sugar', 'gulatotal': 'sugar', 'gula total': 'sugar',
    'salt': 'salt', 'garam': 'salt', 'sodium': 'salt', 'natrium': 'salt',
    'protein': 'protein',
    'servingsize': 'servingSize', 'takaransaji': 'servingSize', 'takaran saji': 'servingSize',
    'servingspercontainer': 'servingsPerContainer', 'jumlahsajianperkemasan': 'servingsPerContainer', 'sajianperkemasan': 'servingsPerContainer', 'sajian per kemasan': 'servingsPerContainer'
  };

  Object.keys(obj).forEach(k => {
    const cleanKey = k.toLowerCase().replace(/_/g, '').replace(/-/g, '').trim();
    const standardKey = keyMapping[cleanKey] || k;
    normalized[standardKey] = obj[k];
  });
  
  return normalized;
}

export function NutritionLabelTable({ activeScoutItems, onConfirmItem, defaultOpen = false, language = "en" }: { activeScoutItems: any[], onConfirmItem?: (idx: any) => void, defaultOpen?: boolean, language?: string }) {
  const t = translations[language || "en"] || translations.en;
  let items = activeScoutItems;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch(e) { items = []; }
  }
  if (!Array.isArray(items) || !items.length) return null;
  // Only `rawNutritionLabel` is gated on "a real physical panel is visible" — `nutritionFacts`
  // is a general-purpose estimate field and must never be treated as evidence of a real label.
  const processedItems = items.map(item => {
    if (!item) return item;
    let parsedRaw = item.rawNutritionLabel;
    if (typeof parsedRaw === 'string') {
      try { parsedRaw = JSON.parse(parsedRaw.replace(/'/g, '"')); } catch (e) { parsedRaw = null; }
    }
    let parsedFacts = item.nutritionFacts;
    if (typeof parsedFacts === 'string') {
      try { parsedFacts = JSON.parse(parsedFacts.replace(/'/g, '"')); } catch (e) { parsedFacts = null; }
    }
    
    let autoCorrectedCalories = item.autoCorrectedCalories || false;
    let originalCalories = item.originalCalories || null;
    let correctedRaw = normalizeNutritionKeys(parsedRaw);
    let correctedFacts = normalizeNutritionKeys(parsedFacts);
    
    // Check if anomalyFlags indicate calorie correction
    if (item.anomalyFlags && Array.isArray(item.anomalyFlags)) {
      const calorieFlag = item.anomalyFlags.find((f: string) => f.includes("calories mathematically auto-corrected from"));
      if (calorieFlag) {
        autoCorrectedCalories = true;
        const match = calorieFlag.match(/from (\d+(?:\.\d+)?) to/);
        if (match) {
          originalCalories = match[1];
        }
      }
    }
    
    return { 
      ...item, 
      rawNutritionLabel: correctedRaw, 
      nutritionFacts: correctedFacts,
      autoCorrectedCalories,
      originalCalories
    };
  });

  const NON_NUTRIENT_LABEL_KEYS = new Set(['servingSize', 'weight', 'servingsPerContainer']);

  const hasLabels = processedItems.some((item: any) => {
    if (!item || !item.rawNutritionLabel || typeof item.rawNutritionLabel !== 'object') {
      return false;
    }
    const keys = Object.keys(item.rawNutritionLabel).filter(k => !NON_NUTRIENT_LABEL_KEYS.has(k));
    if (keys.length === 0) return false;
    return keys.some(k => {
      const val = item.rawNutritionLabel[k];
      return val !== undefined && val !== null && val !== '' && val !== '-' && val !== '--';
    });
  });

  if (!hasLabels) return null;

  return (
    <div className="mt-2 text-left pt-1 font-sans">
      <details className="group [&_summary::-webkit-details-marker]:hidden" open={defaultOpen}>
        <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-indigo-600 dark:text-indigo-400 select-none">
          <span>{t.viewNutritionLabels}</span>
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
          {processedItems.map((item: any, i: number) => {
            const meaningfulRawKeys = item.rawNutritionLabel
              ? Object.keys(item.rawNutritionLabel).filter((k: string) =>
                  !NON_NUTRIENT_LABEL_KEYS.has(k) &&
                  item.rawNutritionLabel[k] !== undefined &&
                  item.rawNutritionLabel[k] !== null &&
                  item.rawNutritionLabel[k] !== '' &&
                  item.rawNutritionLabel[k] !== '-' &&
                  item.rawNutritionLabel[k] !== '--'
                )
              : [];
            const hasRaw = meaningfulRawKeys.length > 0;
            const hasNut = item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0;
            if (!hasRaw) return null;

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
                className="text-[10px] text-theme-text-secondary bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-theme-border/80"
              >
                <strong className="block text-slate-800 dark:text-slate-200 mb-2 font-display text-xs">
                  {item.originalName || item.keyword}
                </strong>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
                  <div className="font-medium text-theme-neutral">
                    <span className="text-slate-400 font-normal">{t.weightLabelWithColon}</span>{' '}
                    {missingWeight ? <span className="text-amber-500 font-bold">{t.unknown}</span> : `${item.estimatedWeightGrams}g`}
                  </div>
                  {(item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize) && (
                    <div className="font-medium text-theme-neutral">
                      <span className="text-slate-400 font-normal">{t.servingSizeColon}</span>{' '}
                      {item.rawNutritionLabel?.servingSize || item.nutritionFacts?.servingSize}
                    </div>
                  )}
                  {((item.rawNutritionLabel?.servingsPerContainer !== undefined && item.rawNutritionLabel?.servingsPerContainer !== null) || 
                    (item.nutritionFacts?.servingsPerContainer !== undefined && item.nutritionFacts?.servingsPerContainer !== null)) && (
                    <div className="font-medium text-theme-neutral">
                      <span className="text-slate-400 font-normal">{t.servingsPerContainerColon}</span>{' '}
                      {item.rawNutritionLabel?.servingsPerContainer !== undefined && item.rawNutritionLabel?.servingsPerContainer !== null 
                        ? item.rawNutritionLabel.servingsPerContainer 
                        : item.nutritionFacts?.servingsPerContainer}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-theme-border/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                        <th className="py-1.5 px-2 font-bold text-theme-text-secondary border-b border-theme-border/50">
                          Nutrient
                        </th>
                        <th className="py-1.5 px-2 font-bold text-theme-text-secondary border-b border-theme-border/50">
                          Original
                        </th>
                        <th className="py-1.5 px-2 font-bold text-theme-text-secondary border-b border-theme-border/50 whitespace-nowrap">
                          Total
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
                        
                        const isServingField = k.toLowerCase().includes('serving');
                        
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
                          const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (isServingField ? '' : (nutDef ? nutDef.unit : 'g'));
                          const unit = String(originalVal).replace(/[\d.\s]/g, '') || defaultUnit;
                          if (isServingField) {
                            totalStr = '-';
                          } else {
                            totalStr = `${total}${unit}`;
                          }
                        }

                        let originalDisplay = '-';
                        if (originalVal !== undefined && originalVal !== null) {
                          const hasUnit = /[a-zA-Z%]/.test(String(originalVal));
                          if (hasUnit && !isServingField) {
                            originalDisplay = String(originalVal);
                          } else {
                            const nutDef = nutrientDefinitions.find((n: any) => n.key.toLowerCase() === k.toLowerCase());
                            const defaultUnit = k.toLowerCase().includes('calories') ? 'kcal' : (isServingField ? '' : (nutDef ? nutDef.unit : 'g'));
                            originalDisplay = `${originalVal}${defaultUnit}`;
                          }
                        }

                        return (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-2 font-medium text-theme-neutral capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="py-1.5 px-2 text-theme-text-secondary relative group/tooltip">
                              <div className="flex items-center gap-1">
                                {originalDisplay}
                                {k.toLowerCase().includes('calories') && item.autoCorrectedCalories && (
                                  <div className="relative z-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 cursor-help">
                                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                      <path d="M12 9v4"></path>
                                      <path d="M12 17h.01"></path>
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-normal min-w-[200px] w-max max-w-[250px] p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg text-center">
                                      {t.abnormalValueMsg.replace("{item.originalCalories}", item.originalCalories).replace("{originalDisplay}", originalDisplay)}
                                    </div>
                                  </div>
                                )}
                              </div>
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

                {item.ingredientsList && (
                  <div className="mt-2.5 p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-lg text-[9.5px] leading-normal border border-slate-200/40 dark:border-slate-700/30 text-left">
                    <span className="font-bold text-theme-text-secondary uppercase tracking-wider block mb-1 text-[8.5px]">{t.ingredientsLabel}</span>
                    <span className="text-theme-neutral font-normal">{item.ingredientsList}</span>
                  </div>
                )}

                {showWarning && (
                  <div className="mt-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-2 font-sans">
                    <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold leading-tight">
                          {missingWeight ? t.missingPortionSize : t.visualScoutUnclear}
                        </span>
                        <span className="text-[10px] font-medium leading-tight opacity-90 mt-0.5">
                          {isUnclear 
                            ? `Low confidence or anomalies detected (${item.anomalyFlags?.join(', ') || 'unclear detail'}).` 
                            : t.providePortionSize}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        Edit Item
                      </button>
                      <button 
                        onClick={() => { 
                          if (onConfirmItem) {
                            onConfirmItem(item.scoutIndex ?? i);
                          }
                        }} 
                        className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                      >
                        This is correct
                      </button>
                    </div>
                  </div>
                )}
                {item._preservedAnomalyFlags && item._preservedAnomalyFlags.length > 0 && (
                  <div className="mt-2 text-[10px] text-theme-text-secondary font-sans px-1">
                    t.noteAnomaly
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
