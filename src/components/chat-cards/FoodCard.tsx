import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import { NutrientPieChart } from '../NutrientPieChart';

import { nutrientDefinitions } from '../../utils/nutrition';
import { FoodLog } from '../../types';

interface CroppedFoodImageProps {
  src: string;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] from 0 to 1000
  alt: string;
  className?: string;
  onTap?: () => void;
  imageUrls?: string[];
  sourceImageIndex?: number | null;
}

export const CroppedFoodImage: React.FC<CroppedFoodImageProps> = ({ 
  src, 
  boundingBox, 
  alt, 
  className, 
  onTap,
  imageUrls,
  sourceImageIndex
}) => {
  const [croppedSrc, setCroppedSrc] = React.useState<string | null>(null);

  const baseImageSrc = React.useMemo(() => {
    if (imageUrls && imageUrls.length > 0 && typeof sourceImageIndex === 'number' && sourceImageIndex >= 0 && sourceImageIndex < imageUrls.length) {
      return imageUrls[sourceImageIndex];
    }
    return src;
  }, [src, imageUrls, sourceImageIndex]);

  React.useEffect(() => {
    if (!baseImageSrc || !boundingBox || boundingBox.length !== 4) {
      setCroppedSrc(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid potential CORS issues
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const [ymin, xmin, ymax, xmax] = boundingBox;
        
        // Coordinates are normalized 0-1000
        const x = (xmin / 1000) * img.naturalWidth;
        const y = (ymin / 1000) * img.naturalHeight;
        const width = ((xmax - xmin) / 1000) * img.naturalWidth;
        const height = ((ymax - ymin) / 1000) * img.naturalHeight;

        // Ensure we don't have zero dimensions
        if (width <= 0 || height <= 0) {
          setCroppedSrc(baseImageSrc);
          return;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

        setCroppedSrc(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        console.error('Error cropping image:', err);
        // Fallback to original image if cropping fails
        setCroppedSrc(baseImageSrc);
      }
    };
    img.onerror = () => {
      setCroppedSrc(baseImageSrc);
    };
    img.src = baseImageSrc;
  }, [baseImageSrc, boundingBox]);

  const displaySrc = croppedSrc || baseImageSrc;

  return (
    <img 
      src={displaySrc} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onClick={onTap}
    />
  );
};

const getFoodImageUrl = (foodName: string, suppliedUrl?: string) => {
  if (suppliedUrl && suppliedUrl.startsWith('http')) return suppliedUrl;
  
  const name = foodName.toLowerCase();
  
  // High-quality handpicked Unsplash food images for common categories
  if (name.includes('cheese') || name.includes('cheddar') || name.includes('mozzarella') || name.includes('dairy')) {
    return "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('pasta') || name.includes('macaroni') || name.includes('spaghetti')) {
    return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('beef') || name.includes('steak') || name.includes('chuck') || name.includes('meat') || name.includes('hot pot')) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('spinach') || name.includes('salad') || name.includes('greens') || name.includes('raw vegetable') || name.includes('vegetable')) {
    return "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('mushroom') || name.includes('fungi') || name.includes('enoki')) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('chicken') || name.includes('poultry') || name.includes('turkey')) {
    return "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('salmon') || name.includes('fish') || name.includes('tuna') || name.includes('seafood')) {
    return "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('rice') || name.includes('grain') || name.includes('noodle') || name.includes('sushi') || name.includes('dumpling')) {
    return "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('egg')) {
    return "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('avocado')) {
    return "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('bread') || name.includes('toast') || name.includes('sourdough')) {
    return "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes('apple') || name.includes('fruit') || name.includes('berry') || name.includes('banana')) {
    return "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=400&auto=format&fit=crop&q=60";
  }
  
  return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&auto=format&fit=crop&q=60";
};

export const FoodCard: React.FC<AgentCardProps> = ({
  msg, messages, report, foodLogs, t, formatNutrientValue,
  onLogFood, setLoggedMessageIds, loggedMessageIds, profile
}) => {
  const [expandedTables, setExpandedTables] = React.useState<Record<string, boolean>>({});
  const [fullScreenImg, setFullScreenImg] = React.useState<string | null>(null);

  if (msg.agentType !== 'food') return null;

  const userUploadedImages = messages ? (() => {
    const urls: string[] = [];
    messages.forEach(m => {
      if (m.imageUrls && m.imageUrls.length > 0) {
        urls.push(...m.imageUrls);
      } else if (m.imageUrl) {
        urls.push(m.imageUrl);
      }
    });
    return urls;
  })() : [];

  const getNutrientFromTable = (comparisonTable: any, nutrientNameQuery: string, foodIdx: number): string | null => {
    if (!comparisonTable || !comparisonTable.rows) return null;
    const row = comparisonTable.rows.find((r: any) => 
      r.nutrient && r.nutrient.toLowerCase().includes(nutrientNameQuery.toLowerCase())
    );
    if (!row || !row.values || row.values.length <= foodIdx) return null;
    return row.values[foodIdx];
  };

  return (
    <>
      {msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && (
                    <div className="space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden bg-transparent">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words flex flex-wrap items-center gap-1.5 w-full">
                          <span className="shrink-0">⚖️ Comparison:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold break-words">{msg.data?.agentResult.comparison.keyNutrientConcern || 'Nutrients of Concern'}</span>
                        </h4>
                      </div>

                      {/* Foods Comparison Cards - Horizontally Scrollable (200px wide, borderless, separated by vertical dividers with 10px spacing) */}
                      <div className="flex gap-0 mt-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full">
                        {(msg.data?.agentResult.comparison.foods || []).map((food: any, idx: number) => {
                          const lowerSuit = String(food.suitability || '').toLowerCase();
                          const isBest = lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('recommended') || lowerSuit.includes('good') || lowerSuit.includes('perfect');
                          
                          let suitabilityClass = "text-slate-700 dark:text-slate-300";
                          let suitabilityBadgeBg = "bg-slate-100 dark:bg-slate-800";
                          if (lowerSuit.includes('good') || lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('low risk')) {
                            suitabilityClass = "text-emerald-700 dark:text-emerald-400";
                            suitabilityBadgeBg = "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50";
                          } else if (lowerSuit.includes('moderate') || lowerSuit.includes('medium') || lowerSuit.includes('caution') || lowerSuit.includes('amber') || lowerSuit.includes('yellow')) {
                            suitabilityClass = "text-amber-700 dark:text-amber-400";
                            suitabilityBadgeBg = "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50";
                          } else if (lowerSuit.includes('bad') || lowerSuit.includes('avoid') || lowerSuit.includes('high risk') || lowerSuit.includes('severe') || lowerSuit.includes('red')) {
                            suitabilityClass = "text-rose-700 dark:text-rose-400";
                            suitabilityBadgeBg = "bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50";
                          }

                          // Format suitability text nicely
                          const suitText = food.suitability ? (
                            food.suitability.toLowerCase().includes('moderate') ? 'Moderate risk' :
                            food.suitability.toLowerCase().includes('high') ? 'High risk' :
                            food.suitability.toLowerCase().includes('low') ? 'Low risk' :
                            food.suitability.toLowerCase().includes('safe') ? 'Safest option' :
                            food.suitability.toLowerCase().includes('avoid') ? 'Avoid' :
                            food.suitability
                          ) : '';

                          // Find a matching visual scout item for cropping as a fallback
                          const matchingScout = (msg.data?.scoutItems || []).find((s: any) => 
                            food.name.toLowerCase().includes(s.keyword.toLowerCase()) || 
                            s.keyword.toLowerCase().includes(food.name.toLowerCase()) ||
                            food.name.toLowerCase().split(' ')[0] === s.keyword.toLowerCase().split(' ')[0]
                          );

                          // Food picture priority: user uploaded first based on sourceImageIndex, fallback to external
                          const currentMsgImages = msg.imageUrls && msg.imageUrls.length > 0
                            ? msg.imageUrls
                            : (msg.imageUrl ? [msg.imageUrl] : []);
                          
                          const imgIdx = typeof food.sourceImageIndex === 'number' 
                            ? food.sourceImageIndex 
                            : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : -1);
                          
                          const resolvedImgSrc = (imgIdx >= 0 && currentMsgImages[imgIdx])
                            ? currentMsgImages[imgIdx]
                            : getFoodImageUrl(food.name, food.imageUrl);

                          // Dynamic nutrient extraction from comparisonTable (or legacy comparisonTableYaml) rows
                          const yamlTable = msg.data?.agentResult.comparison.comparisonTable || msg.data?.agentResult.comparison.comparisonTableYaml;
                          const weight = food.weightGrams || getNutrientFromTable(yamlTable, 'weight', idx) || '--';
                          const calories = getNutrientFromTable(yamlTable, 'calories', idx) || getNutrientFromTable(yamlTable, 'energy', idx) || '--';
                          
                          const nutrientRows = (yamlTable?.rows || []).filter((row: any) => {
                            const name = String(row.nutrient || '').toLowerCase();
                            return !name.includes('calories') && !name.includes('energy') && !name.includes('pros') && !name.includes('cons') && !name.includes('weight');
                          }).slice(0, 3);

                          const recommendationText = food.profileRecommendation || 
                            (food.pros || food.cons 
                              ? `${food.pros ? `✓ Pros: ${food.pros}. ` : ''}${food.cons ? `✗ Cons: ${food.cons}` : ''}` 
                              : '');

                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <div className="w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch my-2 shrink-0 mx-[10px]" />
                              )}
                              <div className="w-[200px] shrink-0 snap-align-start flex flex-col relative space-y-2">
                                {/* Food Image Box - tap triggers full screen */}
                                <div 
                                  className="w-full h-28 overflow-hidden rounded-lg relative bg-slate-100 dark:bg-slate-850 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setFullScreenImg(resolvedImgSrc)}
                                >
                                  {food.boundingBox2D ? (
                                    <CroppedFoodImage 
                                      src={resolvedImgSrc} 
                                      boundingBox={food.boundingBox2D} 
                                      alt={food.name} 
                                      className="w-full h-full object-cover"
                                      imageUrls={userUploadedImages}
                                      sourceImageIndex={food.sourceImageIndex}
                                    />
                                  ) : matchingScout?.boundingBox2D ? (
                                    <CroppedFoodImage 
                                      src={resolvedImgSrc} 
                                      boundingBox={matchingScout.boundingBox2D} 
                                      alt={food.name} 
                                      className="w-full h-full object-cover"
                                      imageUrls={userUploadedImages}
                                      sourceImageIndex={matchingScout.sourceImageIndex ?? null}
                                    />
                                  ) : (
                                    <img 
                                      src={resolvedImgSrc} 
                                      alt={food.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                </div>

                                <div className="flex items-start justify-between min-h-[1.5rem]">
                                  {/* Wrap title if longer, text-xs bold */}
                                  <span className="font-bold text-xs text-slate-850 dark:text-slate-100 break-words leading-tight w-full">{food.name}</span>
                                </div>

                                {/* Dynamic Table of weight, calories, and top 3 nutrients with no vertical stretching */}
                                <div className="space-y-1 text-[11px] font-mono leading-tight">
                                  <div className="flex justify-between border-b border-slate-100/30 dark:border-slate-800/20 py-0.5">
                                    <span className="font-sans text-slate-450 dark:text-slate-500 font-medium">Weight:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{weight !== '--' ? `${weight} g` : '--'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100/30 dark:border-slate-800/20 py-0.5">
                                    <span className="font-sans text-slate-450 dark:text-slate-500 font-medium">Calories:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{calories !== '--' && !String(calories).includes('kcal') ? `${calories} kcal` : calories}</span>
                                  </div>
                                  {nutrientRows.map((row: any, rIdx: number) => {
                                    const val = row.values && row.values[idx] !== undefined ? row.values[idx] : '--';
                                    let displayName = row.nutrient;
                                    const lower = displayName.toLowerCase();
                                    if (lower.includes('saturated fat')) displayName = 'Sat Fat';
                                    else if (lower.includes('cholesterol')) displayName = 'Cholesterol';
                                    else if (lower.includes('sodium')) displayName = 'Sodium';
                                    else if (lower.includes('sugar')) displayName = 'Sugar';
                                    else {
                                      displayName = displayName.split('(')[0].trim();
                                    }
                                    return (
                                      <div key={rIdx} className="flex justify-between border-b border-slate-100/30 dark:border-slate-800/20 py-0.5">
                                        <span className="font-sans text-slate-450 dark:text-slate-500 font-medium truncate max-w-[100px]">{displayName}:</span>
                                        <span className="text-slate-900 dark:text-slate-200">{val}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Suitability & Pro/Con with matching text-xs font sizes and no odd spacing gaps */}
                                <div className="pt-1.5 space-y-1.5">
                                  {recommendationText && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight font-normal whitespace-pre-wrap text-left select-none">
                                      {recommendationText}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Side-by-Side Comparison Matrix with highlighted suitability row */}
                      {msg.data?.agentResult.comparison && (msg.data?.agentResult.comparison.comparisonTable || msg.data?.agentResult.comparison.comparisonTableYaml) && (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10 mt-3 text-left">
                          <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              📊 Side-by-Side Comparison Matrix
                            </span>
                          </div>
                          <div className="p-0 overflow-x-auto">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                  <th className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">Nutrient / Aspect</th>
                                  {(msg.data?.agentResult.comparison.foods || []).map((food: any, i: number) => (
                                    <th key={i} className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">{food.name}</th>
                                  ))}
                                  <th className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">Target</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {/* Highlighted Dietitian Suitability Row */}
                                <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-950/40">
                                  <td className="px-3 py-2 whitespace-nowrap font-bold text-indigo-900 dark:text-indigo-200">
                                    ✨ Suitability Verdict
                                  </td>
                                  {(msg.data?.agentResult.comparison.foods || []).map((food: any, i: number) => {
                                    const suitability = food.suitability || 'N/A';
                                    const lowerSuit = suitability.toLowerCase();
                                    let badgeClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
                                    if (lowerSuit.includes('good') || lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('low risk') || lowerSuit.includes('ideal') || lowerSuit.includes('recommend')) {
                                      badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/20";
                                    } else if (lowerSuit.includes('moderate') || lowerSuit.includes('medium') || lowerSuit.includes('caution') || lowerSuit.includes('warning') || lowerSuit.includes('amber')) {
                                      badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/20";
                                    } else if (lowerSuit.includes('bad') || lowerSuit.includes('avoid') || lowerSuit.includes('high risk') || lowerSuit.includes('severe') || lowerSuit.includes('red') || lowerSuit.includes('restrict')) {
                                      badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/20";
                                    }
                                    return (
                                      <td key={i} className="px-3 py-2 whitespace-nowrap">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                          {suitability}
                                        </span>
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-2 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-bold font-mono text-[10px]">
                                    Goal Target
                                  </td>
                                </tr>

                                {((msg.data?.agentResult.comparison.comparisonTable || msg.data?.agentResult.comparison.comparisonTableYaml).rows || []).map((row: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group">
                                    <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-150">{row.nutrient}</td>
                                    {(row.values || []).map((val: string, vIdx: number) => (
                                      <td key={vIdx} className="px-3 py-1.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{val}</td>
                                    ))}
                                    <td className="px-3 py-1.5 whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold">{row.target}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

      {/* Full-screen image preview overlay modal */}
      {fullScreenImg && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300"
          onClick={() => setFullScreenImg(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center">
            <img 
              src={fullScreenImg} 
              alt="Full screen preview" 
              className="max-w-full max-h-[80vh] rounded-xl object-contain border border-slate-800 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setFullScreenImg(null)}
              className="mt-4 px-5 py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full font-bold text-xs border border-slate-700 shadow-md transition-all cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

                  {msg.data?.pendingFoodLog && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden font-sans">
                      {msg.data?.pendingFoodLog.imageUrls && msg.data?.pendingFoodLog.imageUrls.length > 0 && (
                        <div className="overflow-hidden border-y sm:border border-slate-100 dark:border-slate-700/50 shadow-sm mb-3 w-[calc(100%+2rem)] -mx-4 sm:mx-0 sm:w-full sm:rounded-2xl">
                          <ImageSlider images={msg.data?.pendingFoodLog.imageUrls} altText={msg.data?.pendingFoodLog.name || "Pending meal"} />
                        </div>
                      )}
                      
                      {/* Unified display of agent detailed clinical prose inside the card */}
                      {msg.content && (
                        <div className="text-[11.5px] text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 leading-relaxed whitespace-pre-line mb-3 font-sans text-left">
                          {msg.content}
                        </div>
                      )}

                      {msg.data?.scoutItems && msg.data.scoutItems.length > 0 && (
                        <div className="mb-3 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                          <div className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1.5">🔍 Visual Scout Identified</div>
                          <div className="space-y-1">
                            {msg.data.scoutItems.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[65%]">
                                  {item.originalName || item.keyword}
                                </span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                  {item.source === 'label' ? '🏷️' : '👁️'} {item.estimatedWeightGrams}g
                                </span>
                              </div>
                            ))}
                          </div>
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

                      <div className="text-[11.5px] space-y-2 text-slate-800 dark:text-slate-100 font-medium text-left font-sans leading-relaxed">
                        <p><strong className="text-slate-900 dark:text-white">{t.composition}:</strong> {msg.data?.pendingFoodLog.composition}</p>
                        <p><strong className="text-slate-900 dark:text-white">{t.benefits}:</strong> {msg.data?.pendingFoodLog.benefits}</p>
                        {msg.data?.pendingFoodLog.risks && <p><strong className="text-slate-900 dark:text-white">{t.risks}:</strong> {msg.data?.pendingFoodLog.risks}</p>}
                        <p><strong className="text-slate-900 dark:text-white">{t.impact}:</strong> {msg.data?.pendingFoodLog.healthImpact}</p>
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
