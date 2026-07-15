import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import { NutrientPieChart } from '../NutrientPieChart';

import { nutrientDefinitions } from '../../utils/nutrition';
import { PRIMARY_NUTRIENTS } from '../../utils/nutrients';
import { FoodLog } from '../../types';
import { resolveFoodImage } from '../../utils/imageResolver';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomableImage } from '../ZoomableImage';
import { FoodScoutItemPreview } from './FoodScoutItemPreview';

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
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError] = React.useState<boolean>(false);

  const baseImageSrc = React.useMemo(() => {
    if (imageUrls && imageUrls.length > 0 && typeof sourceImageIndex === 'number' && sourceImageIndex >= 0 && sourceImageIndex < imageUrls.length) {
      return imageUrls[sourceImageIndex];
    }
    return src;
  }, [src, imageUrls, sourceImageIndex]);

  React.useEffect(() => {
    if (!baseImageSrc || !boundingBox || boundingBox.length !== 4) {
      setError(true);
      return;
    }
    
    setError(false);
    const img = new Image();
    if (baseImageSrc.startsWith('http')) { img.crossOrigin = 'anonymous'; }
    
    img.onload = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
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
          setError(true);
          return;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      } catch (err) {
        console.error('Error drawing image:', err);
        setError(true);
      }
    };
    img.onerror = () => {
      setError(true);
    };
    img.src = baseImageSrc;
  }, [baseImageSrc, boundingBox]);

  if (error) {
    if (!boundingBox || boundingBox.length !== 4) {
      return (
        <img 
          src={baseImageSrc} 
          alt={alt} 
          className={className}
          referrerPolicy="no-referrer"
          onClick={onTap}
        />
      );
    }
    const [ymin, xmin, ymax, xmax] = boundingBox;
    const top = ymin / 10;
    const left = xmin / 10;
    const height = Math.max((ymax - ymin) / 10, 1);
    const width = Math.max((xmax - xmin) / 10, 1);
    const scaleX = 100 / width;
    const scaleY = 100 / height;
    
    return (
      <div className={`overflow-hidden relative ${className || ''}`} onClick={onTap} title={alt}>
        <img 
          src={baseImageSrc} 
          alt={alt}
          referrerPolicy="no-referrer"
          className="absolute max-w-none"
          style={{
            top: `-${top * scaleY}%`,
            left: `-${left * scaleX}%`,
            width: `${100 * scaleX}%`,
            height: `${100 * scaleY}%`,
            objectFit: 'fill'
          }}
        />
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef}
      className={className}
      onClick={onTap}
      title={alt}
    />
  );
};

const getFoodImageUrl = (foodName: string, suppliedUrl?: string) => {
  if (suppliedUrl && suppliedUrl.startsWith('http')) return suppliedUrl;
  
  const name = foodName.toLowerCase();
  
  // Specific category: Pepper, Spices, Seasonings, Herbs
  if (name.includes('pepper') || name.includes('spice') || name.includes('chili') || name.includes('salt') || name.includes('seasoning') || name.includes('powder') || name.includes('herb') || name.includes('curry')) {
    return "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&auto=format&fit=crop&q=60";
  }

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
  
  // Dynamic Host/User Timezone & Locale based fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
    
    // East Asia, Southeast Asia, South Asia, Europe etc. fallback
    if (tz.includes('tokyo') || tz.includes('seoul') || tz.includes('shanghai') || tz.includes('singapore') || tz.includes('taipei') || tz.includes('bangkok') || tz.includes('jakarta') || tz.includes('manila') || tz.includes('hanoi') || tz.includes('asia') || tz.includes('japan') || tz.includes('korea')) {
      return "https://images.unsplash.com/photo-1511910849309-0d5f2c18a29e?w=400&auto=format&fit=crop&q=60"; // Asian noodle & soup healthy bowl
    }
    if (tz.includes('kolkata') || tz.includes('asia/calcutta') || tz.includes('delhi') || tz.includes('bombay') || tz.includes('india') || tz.includes('chennai') || tz.includes('bengaluru')) {
      return "https://images.unsplash.com/photo-1585938338392-50a59970d8ee?w=400&auto=format&fit=crop&q=60"; // Indian curry plate
    }
    if (tz.includes('europe') || tz.includes('london') || tz.includes('paris') || tz.includes('berlin') || tz.includes('rome') || tz.includes('madrid') || tz.includes('amsterdam') || tz.includes('brussels')) {
      return "https://images.unsplash.com/photo-1490815685121-030b3e31f29c?w=400&auto=format&fit=crop&q=60"; // Mediterranean European dining
    }
  } catch (e) {
    // Ignore error
  }

  // Universal healthy food generic fallback
  return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&auto=format&fit=crop&q=60";
};

interface GroupItemsContainerProps {
  children: React.ReactNode;
  groupKey: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const GroupItemsContainer: React.FC<GroupItemsContainerProps> = ({ children, groupKey, isExpanded, onToggle }) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [shouldShowButton, setShouldShowButton] = React.useState(false);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkHeight = () => {
      setShouldShowButton(el.scrollHeight > 800);
    };

    checkHeight();
    
    const observer = new ResizeObserver(checkHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="relative w-full">
      <div 
        ref={contentRef}
        className="w-full overflow-hidden transition-all duration-300"
        style={{ maxHeight: isExpanded ? 'none' : '800px' }}
      >
        {children}
      </div>
      
      {shouldShowButton && (
        <div className={`w-full flex justify-center pt-4 ${!isExpanded ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent pt-16 pb-2 z-10' : 'pb-2'}`}>
          <button
            type="button"
            onClick={onToggle}
            className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer border border-slate-200/60 dark:border-slate-700/50"
          >
            {isExpanded ? (
              <>
                <span>View Less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>View More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export const FoodCard: React.FC<AgentCardProps> = ({
  msg, messages, report, foodLogs, t, formatNutrientValue,
  onLogFood, setLoggedMessageIds, loggedMessageIds, profile
}) => {
  const [expandedTables, setExpandedTables] = React.useState<Record<string, boolean>>({});
  const [expandedScouts, setExpandedScouts] = React.useState<Record<string, boolean>>({});
  const [fullScreenImg, setFullScreenImg] = React.useState<{ src: string, boundingBox?: number[], foodName?: string, navItems?: { src: string, boundingBox?: number[], foodName?: string }[], navIndex?: number } | null>(null);

  const [searchModes, setSearchModes] = React.useState<Record<string, boolean>>({});
  const [searchedItemIndices, setSearchedItemIndices] = React.useState<Record<string, number>>({});
  const [searchResults, setSearchResults] = React.useState<Record<string, Array<{title: string, imageUrl: string, pageUrl: string}>>>({});
  const [searchLoading, setSearchLoading] = React.useState<Record<string, boolean>>({});
  const [groupExpanded, setGroupExpanded] = React.useState<Record<string, boolean>>({});

  const handleFoodSearch = async (groupIdx: number, itemIdx: number, query: string) => {
    const groupKey = `${msg.id}-${groupIdx}`;
    setSearchedItemIndices(prev => ({ ...prev, [groupKey]: itemIdx }));
    setSearchLoading(prev => ({ ...prev, [groupKey]: true }));
    setSearchModes(prev => ({ ...prev, [groupKey]: true }));
    try {
      const response = await fetch("/api/gemini/food-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setSearchResults(prev => ({ ...prev, [groupKey]: data.images }));
      } else {
        // Clear previous and set empty array (could indicate isAvailable: false)
        setSearchResults(prev => ({ ...prev, [groupKey]: [] }));
      }
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults(prev => ({ ...prev, [groupKey]: [] }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [groupKey]: false }));
    }
  };

  if (msg.agentType !== 'food') return null;

  const userUploadedImages = React.useMemo(() => {
    if (!messages) return [];
    const urls: string[] = [];
    messages.forEach(m => {
      if (m.imageUrls && m.imageUrls.length > 0) {
        urls.push(...m.imageUrls);
      } else if (m.imageUrl) {
        urls.push(m.imageUrl);
      }
    });
    return urls.map(url => resolveFoodImage(url, foodLogs) || url);
  }, [messages, foodLogs]);

  const messageImages = React.useMemo(() => {
    // 1. If the current assistant message itself has imageUrls or imageUrl
    const localUrls = msg.imageUrls && msg.imageUrls.length > 0
      ? msg.imageUrls
      : (msg.imageUrl ? [msg.imageUrl] : []);
    
    if (localUrls.length > 0) {
      return localUrls.map(url => resolveFoodImage(url, foodLogs) || url);
    }

    // 2. If the pending food log in msg has imageUrls
    if (msg.data?.pendingFoodLog?.imageUrls && msg.data.pendingFoodLog.imageUrls.length > 0) {
      return msg.data.pendingFoodLog.imageUrls.map((url: string) => resolveFoodImage(url, foodLogs) || url);
    }
    if (msg.pendingFoodLog?.imageUrls && msg.pendingFoodLog.imageUrls.length > 0) {
      return msg.pendingFoodLog.imageUrls.map((url: string) => resolveFoodImage(url, foodLogs) || url);
    }

    // 3. Find the closest preceding user message that has images to make sure we don't bleed images from previous entries
    if (messages) {
      const currentIdx = messages.indexOf(msg);
      if (currentIdx !== -1) {
        for (let i = currentIdx - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.imageUrls && m.imageUrls.length > 0) {
            return m.imageUrls.map(url => resolveFoodImage(url, foodLogs) || url);
          }
          if (m.imageUrl) {
            return [resolveFoodImage(m.imageUrl, foodLogs) || m.imageUrl];
          }
        }
      }
    }

    // 4. Fallback to all user uploaded images in the conversation
    return userUploadedImages;
  }, [msg, messages, userUploadedImages, foodLogs]);

  const getNutrientFromTable = (comparisonTable: any, nutrientNameQuery: string, foodIdx: number): string | null => {
    if (!comparisonTable || !comparisonTable.rows) return null;
    const row = comparisonTable.rows.find((r: any) => 
      r.nutrient && r.nutrient.toLowerCase().includes(nutrientNameQuery.toLowerCase())
    );
    if (!row || !row.values || row.values.length <= foodIdx) return null;
    return row.values[foodIdx];
  };

  const displayGroups = React.useMemo(() => {
    return msg.data?.agentResult?.comparison?.groups || [];
  }, [msg.data?.agentResult?.comparison?.groups]);

  return (
    <>
      {msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && (
                    <div className="space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden bg-transparent">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words flex flex-wrap items-center gap-1.5 w-full">
                          <span className="shrink-0">⚖️ Comparison:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold break-words">
                            {(() => {
                              const val = msg.data?.agentResult?.comparison?.comparisonTitle || msg.data?.agentResult?.comparison?.keyNutrientConcern || 'Nutrients of Concern';
                              return typeof val === 'string' ? val.replace(/^key\s*:\s*/i, '') : val;
                            })()}
                          </span>
                        </h4>
                      </div>

                      {/* Foods Comparison Cards - Horizontally Scrollable (200px wide, borderless, separated by vertical dividers with 10px spacing) */}
                      <div className="flex gap-0 mt-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full overscroll-x-contain">
                        {displayGroups.map((group: any, idx: number) => {
                          const lowerSuit = String(group.suitability || '').toLowerCase();
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

                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <div className="w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch my-2 shrink-0 mx-[10px]" />
                              )}
                              <div className="w-[70%] max-w-[420px] shrink-0 snap-align-start flex flex-col relative space-y-3">
                                
                                <div className="flex flex-col gap-1.5">
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-snug">
                                    {group.groupName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {group.suitability && (
                                      <div className={`${suitabilityBadgeBg} ${suitabilityClass} uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit`}>
                                        {group.suitability.toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Aggregated Nutrients */}
                                <div className="space-y-1">
                                  {(() => {
                                    // List of nutrients to render in consistent, prioritized order
                                    const keysToRender = ["calories", "saturatedFat", "sodium", "protein", "totalFat", "carbohydrates", "addedSugar", "potassium", "totalFibre"];
                                    
                                    return keysToRender.map((k) => {
                                      const v = group.averageNutrients?.[k];
                                      if (v === undefined || v === null) return null;
                                      
                                      const nutDef = nutrientDefinitions.find(n => n.key.toLowerCase() === k.toLowerCase());
                                      const unit = k === 'calories' ? 'kcal' : (nutDef ? nutDef.unit : 'g');
                                      const label = k === 'calories' 
                                        ? 'Average Calories' 
                                        : (nutDef ? (nutDef.labels[profile?.language || 'en'] || nutDef.labels.en) : k);
                                        
                                      return (
                                        <div key={k} className="flex justify-between items-center text-xs pb-1 border-b border-slate-100 dark:border-slate-800/50">
                                          <span className="text-slate-500">{label}</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200">{v} {unit}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                                
                                {/* Pros and Cons */}
                                <div className="space-y-1.5 pt-1">
                                  {group.pros && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Pros:</span> {group.pros}
                                    </p>
                                  )}
                                  {group.cons && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                                      <span className="font-semibold text-rose-600 dark:text-rose-400">✗ Cons:</span> {group.cons}
                                    </p>
                                  )}
                                  {group.keyDifferentiator && (
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-tight italic pt-0.5">
                                      ↔ {group.keyDifferentiator}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Items in this bucket */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                  {(() => {
                                    // 1. Precompute groupPreviewItems
                                    const groupPreviewItems = (group.items || []).map((item: any) => {
                                      const matchingScout = (msg.data?.scoutItems || []).find((s: any) => 
                                        item.name.toLowerCase().includes(s.keyword.toLowerCase()) || 
                                        s.keyword.toLowerCase().includes(item.name.toLowerCase()) ||
                                        item.name.toLowerCase().split(' ')[0] === s.keyword.toLowerCase().split(' ')[0]
                                      );
                                      const imgIdx = typeof item.sourceImageIndex === 'number' 
                                        ? item.sourceImageIndex 
                                        : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
                                      const resolvedImgSrc = (messageImages.length > 0)
                                        ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                        : getFoodImageUrl(item.name, '');
                                      const bb = item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);
                                      return { src: resolvedImgSrc, boundingBox: bb, foodName: item.name, imgIdx };
                                    });

                                    // 2. Compute indices of text-only items to check if any exist
                                    const textOnlyIndices = (group.items || []).map((item: any, itemIdx: number) => {
                                      const bb = groupPreviewItems[itemIdx]?.boundingBox;
                                      const height = bb ? Math.abs(bb[2] - bb[0]) : 0;
                                      const width = bb ? Math.abs(bb[3] - bb[1]) : 0;
                                      const aspect = height > 0 ? width / height : 0;
                                      return !bb || bb.length < 4 || (height < 25 && aspect > 2.5) ? itemIdx : -1;
                                    }).filter(index => index !== -1);

                                    const hasTextOnlyItems = textOnlyIndices.length > 0;

                                    const groupKey = `${msg.id}-${idx}`;
                                    const isSearchActive = !!searchModes[groupKey];
                                    const resultsForGroup = searchResults[groupKey] || [];
                                    const isLoadingForGroup = !!searchLoading[groupKey];
                                    const searchedItemIdx = searchedItemIndices[groupKey]; // state-managed, may be undefined

                                    return (
                                      <>
                                        {/* Label area with Search trigger next to it */}
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between w-full font-sans">
                                          <span>Foods in this group ({group.items?.length || 0})</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isSearchActive) {
                                                // Close and reset search state for this group
                                                setSearchModes(prev => ({ ...prev, [groupKey]: false }));
                                                setSearchedItemIndices(prev => {
                                                  const copy = { ...prev };
                                                  delete copy[groupKey];
                                                  return copy;
                                                });
                                                setSearchResults(prev => {
                                                  const copy = { ...prev };
                                                  delete copy[groupKey];
                                                  return copy;
                                                });
                                              } else {
                                                // Open search mode - DO NOT run search automatically
                                                setSearchModes(prev => ({ ...prev, [groupKey]: true }));
                                              }
                                            }}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                            title={isSearchActive ? "Close image search" : "Search image for menu items"}
                                          >
                                            {isSearchActive ? (
                                              <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                                            ) : (
                                              <Search className="w-3.5 h-3.5 stroke-[2.5px]" />
                                            )}
                                          </button>
                                        </div>

                                        {/* Collapsible container using the GroupItemsContainer */}
                                        <GroupItemsContainer
                                          groupKey={groupKey}
                                          isExpanded={!!groupExpanded[groupKey]}
                                          onToggle={() => setGroupExpanded(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                        >
                                          <div className={isSearchActive || !!msg.data?.agentResult?.comparison?.isMenuScale ? "grid grid-cols-2 sm:grid-cols-3 gap-2 w-full pb-8 animate-fade-in" : "grid grid-cols-3 sm:grid-cols-4 gap-3 w-full pb-8"}>
                                            {/* A. If search is active, render search results / loading placeholder FIRST as full width */}
                                            {isSearchActive && (
                                              <div className="col-span-full flex flex-col gap-2.5 w-full mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/60 font-sans">
                                                {searchedItemIdx === undefined ? (
                                                  <div className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-semibold text-center py-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/50 animate-pulse">
                                                    🔍 Click on any food option below to search for its image!
                                                  </div>
                                                ) : isLoadingForGroup ? (
                                                  <div className="grid grid-cols-2 gap-2 w-full animate-pulse">
                                                    <div className="w-full aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-850 flex flex-col items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 gap-1 p-2">
                                                      <span className="font-semibold text-center line-clamp-1">Searching image for:</span>
                                                      <span className="italic text-center text-[9px] line-clamp-1 font-mono">"{group.items[searchedItemIdx]?.name}"</span>
                                                    </div>
                                                    <div className="w-full aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-850 flex flex-col items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 gap-1 p-2">
                                                      <span className="font-semibold text-center line-clamp-1">Searching image for:</span>
                                                      <span className="italic text-center text-[9px] line-clamp-1 font-mono">"{group.items[searchedItemIdx]?.name}"</span>
                                                    </div>
                                                  </div>
                                                ) : resultsForGroup.length > 0 ? (
                                                  <div className="grid grid-cols-2 gap-2 w-full animate-fade-in">
                                                    {resultsForGroup.map((img, rIdx) => (
                                                      <a 
                                                        key={rIdx}
                                                        href={img.pageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col gap-1 w-full group/img cursor-pointer text-left"
                                                      >
                                                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-sm border border-slate-100 dark:border-slate-800">
                                                          <img 
                                                            src={img.imageUrl} 
                                                            alt={img.title}
                                                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                                            referrerPolicy="no-referrer"
                                                          />
                                                        </div>
                                                        <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 group-hover/img:text-indigo-600 dark:group-hover/img:text-indigo-400 font-medium line-clamp-2">
                                                          {img.title}
                                                        </span>
                                                      </a>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                    ⚠️ Image search is currently unavailable for "{group.items[searchedItemIdx]?.name}"
                                                    <div className="text-[9px] text-slate-400 mt-1">Google Custom Search API not authorized or Gemini experiencing high demand.</div>
                                                  </div>
                                                )}
                                                
                                                {searchedItemIdx !== undefined && (
                                                  <div 
                                                    className="w-full flex items-center justify-center p-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm transition-all text-center"
                                                  >
                                                    <span className="text-[10px] font-semibold leading-tight text-indigo-700 dark:text-indigo-300 break-words text-center lowercase">
                                                      searched: <span className="font-bold underline">{group.items[searchedItemIdx]?.name}</span>
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* B. Render all items normally */}
                                            {(group.items || []).map((item: any, itemIdx: number) => {
                                              const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = groupPreviewItems[itemIdx];
                                              const height = bb ? Math.abs(bb[2] - bb[0]) : 0;
                                              const width = bb ? Math.abs(bb[3] - bb[1]) : 0;
                                              const aspect = height > 0 ? width / height : 0;
                                              const isTextOnly = !bb || bb.length < 4 || (height < 25 && aspect > 2.5);
                                              const isActiveSearchItem = isSearchActive && searchedItemIdx === itemIdx;

                                              if (isTextOnly) {
                                                return (
                                                  <div 
                                                    key={itemIdx} 
                                                    className={`flex items-center justify-center p-2.5 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[52px] ${
                                                      isActiveSearchItem 
                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-4 ring-indigo-500/50 shadow-md font-bold scale-[1.03]" 
                                                        : isSearchActive 
                                                          ? "border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.01]" 
                                                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:shadow"
                                                    }`}
                                                    onClick={() => {
                                                      if (isSearchActive) {
                                                        handleFoodSearch(idx, itemIdx, item.name);
                                                      } else {
                                                        setFullScreenImg({ ...groupPreviewItems[itemIdx], navItems: groupPreviewItems, navIndex: itemIdx });
                                                      }
                                                    }}
                                                  >
                                                    <span className={`text-[11px] font-semibold leading-tight break-words text-center lowercase ${isActiveSearchItem ? "text-indigo-700 dark:text-indigo-300 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                                                      {item.name}
                                                    </span>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <FoodScoutItemPreview
                                                  key={itemIdx}
                                                  name={item.name}
                                                  src={resolvedImgSrc}
                                                  boundingBox={bb}
                                                  imgIdx={imgIdx}
                                                  messageImages={messageImages}
                                                  isActive={isActiveSearchItem}
                                                  isSearchMode={isSearchActive}
                                                  onClick={() => {
                                                    if (isSearchActive) {
                                                      handleFoodSearch(idx, itemIdx, item.name);
                                                    } else {
                                                      setFullScreenImg({ ...groupPreviewItems[itemIdx], navItems: groupPreviewItems, navIndex: itemIdx });
                                                    }
                                                  }}
                                                />
                                              );
                                            })}
                                          </div>
                                        </GroupItemsContainer>
                                      </>
                                    );
                                  })()}
                                </div>

                              </div>
                            </React.Fragment>

                          );
                        })}
                      </div>

                    </div>
                  )}

      {/* Full-screen image preview overlay modal */}
      {fullScreenImg && (
        <ZoomableImage 
          src={fullScreenImg.src} 
          boundingBox={fullScreenImg.boundingBox}
          foodName={fullScreenImg.foodName}
          onClose={() => setFullScreenImg(null)}
          hasPrev={!!fullScreenImg.navItems && (fullScreenImg.navIndex || 0) > 0}
          hasNext={!!fullScreenImg.navItems && (fullScreenImg.navIndex || 0) < (fullScreenImg.navItems.length - 1)}
          onPrev={() => {
            if (!fullScreenImg.navItems) return;
            const newIndex = (fullScreenImg.navIndex || 0) - 1;
            setFullScreenImg({ ...fullScreenImg.navItems[newIndex], navItems: fullScreenImg.navItems, navIndex: newIndex });
          }}
          onNext={() => {
            if (!fullScreenImg.navItems) return;
            const newIndex = (fullScreenImg.navIndex || 0) + 1;
            setFullScreenImg({ ...fullScreenImg.navItems[newIndex], navItems: fullScreenImg.navItems, navIndex: newIndex });
          }}
        />
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
                          {typeof msg.content === 'string' ? msg.content.replace(/^Information extracted\.?\s*/i, '') : msg.content}
                        </div>
                      )}

                      {msg.data?.scoutItems && msg.data.scoutItems.length > 0 && (
                        <div className="mb-6 text-left">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/50 pb-2">
                            <span className="text-[10.5px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                              🔍 Visual Scout Identified
                            </span>
                            {msg.data?.pendingFoodLog?.scoutConfidenceRating && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                (() => {
                                  const c = msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase();
                                  if (c.includes('low')) return 'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400';
                                  if (c.includes('medium')) return 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400';
                                  return 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400';
                                })()
                              }`}>
                                Confidence: {msg.data.pendingFoodLog.scoutConfidenceRating}
                              </span>
                            )}
                          </div>

                          {/* Confidence comment warning flag if low/medium - background and box removed */}
                          {msg.data?.pendingFoodLog?.scoutConfidenceComment && (msg.data.pendingFoodLog.scoutConfidenceRating?.toLowerCase().includes('low') || msg.data.pendingFoodLog.scoutConfidenceRating?.toLowerCase().includes('medium')) && (
                            <div className="mb-4 text-[10.5px] text-amber-600 dark:text-amber-400 leading-normal font-medium">
                              ⚠️ <strong>Low/Medium Scout Confidence:</strong> {msg.data.pendingFoodLog.scoutConfidenceComment}
                              <div className="mt-0.5 text-[10px] text-slate-500 italic">
                                Note: You can manually edit any weights or log details below, tell the dietitian what to adjust, or try uploading a clearer picture.
                              </div>
                            </div>
                          )}

                          {/* Slider of Identified Items */}
                          {(() => {
                            const scoutPreviewItems = msg.data.scoutItems.map((sItem: any, sIdx: number) => {
                              const imgIdx = typeof sItem.sourceImageIndex === 'number' ? sItem.sourceImageIndex : 0;
                              const resolvedImgSrc = (messageImages.length > 0)
                                ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                : getFoodImageUrl(sItem.keyword);
                              return {
                                src: resolvedImgSrc,
                                boundingBox: sItem.boundingBox2D || null,
                                foodName: sItem.originalName || sItem.keyword,
                                imgIdx
                              };
                            });

                            return (
                              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full">
                                {msg.data.scoutItems.map((item: any, i: number) => {
                                  const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = scoutPreviewItems[i];

                                  const totalWeight = item.rawNutritionLabel?.totalWeightGrams || item.estimatedWeightGrams || 0;
                                  const portionWeight = item.rawNutritionLabel?.servingSizeGrams;
                                  const multiplier = portionWeight && portionWeight > 0 ? (totalWeight / portionWeight) : 1;
                                  const multiplierStr = multiplier % 1 === 0 ? multiplier.toString() : multiplier.toFixed(1);

                                  const rawLabel = item.rawNutritionLabel;
                                  const nutrientsToDisplay = [];
                                  if (rawLabel) {
                                    if (rawLabel.calories !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Calorie', value: rawLabel.calories, unit: 'kcal', calc: Math.round(rawLabel.calories * multiplier), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.totalFat !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Total fat', value: rawLabel.totalFat, unit: 'g', calc: Number((rawLabel.totalFat * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.saturatedFat !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Saturated fat', value: rawLabel.saturatedFat, unit: 'g', calc: Number((rawLabel.saturatedFat * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.transFat !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Trans fat', value: rawLabel.transFat, unit: 'g', calc: Number((rawLabel.transFat * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.cholesterol !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Cholesterol', value: rawLabel.cholesterol, unit: 'mg', calc: Math.round(rawLabel.cholesterol * multiplier), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.sodium !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Sodium', value: rawLabel.sodium, unit: 'mg', calc: Math.round(rawLabel.sodium * multiplier), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.carbohydrates !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Carbs', value: rawLabel.carbohydrates, unit: 'g', calc: Number((rawLabel.carbohydrates * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.dietaryFiber !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Dietary fiber', value: rawLabel.dietaryFiber, unit: 'g', calc: Number((rawLabel.dietaryFiber * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.addedSugars !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Added sugars', value: rawLabel.addedSugars, unit: 'g', calc: Number((rawLabel.addedSugars * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.protein !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Protein', value: rawLabel.protein, unit: 'g', calc: Number((rawLabel.protein * multiplier).toFixed(1)), showMath: !!portionWeight });
                                    }
                                    if (rawLabel.potassium !== undefined) {
                                      nutrientsToDisplay.push({ label: 'Potassium', value: rawLabel.potassium, unit: 'mg', calc: Math.round(rawLabel.potassium * multiplier), showMath: !!portionWeight });
                                    }
                                  }

                                  const isExpanded = !!expandedScouts[`${msg.id}-${i}`];

                                  return (
                                    <div 
                                      key={i} 
                                      className="w-[185px] shrink-0 snap-align-start flex flex-col relative p-1 space-y-2 text-left"
                                    >
                                      <FoodScoutItemPreview
                                        name={item.originalName || item.keyword}
                                        src={resolvedImgSrc}
                                        boundingBox={bb}
                                        imgIdx={imgIdx}
                                        messageImages={messageImages}
                                        onClick={() => setFullScreenImg({ ...scoutPreviewItems[i], navItems: scoutPreviewItems, navIndex: i })}
                                      />

                                    {/* Toggle expanded details button */}
                                    {nutrientsToDisplay.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedScouts(prev => ({ ...prev, [`${msg.id}-${i}`]: !isExpanded }))}
                                        className="mt-1.5 w-full flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1 cursor-pointer font-sans"
                                      >
                                        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    )}

                                    {/* Expanded Weight & Nutrition Details */}
                                    {(isExpanded || nutrientsToDisplay.length === 0) && (
                                      <div className="mt-1 space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/30 pt-1.5 animation-fade-in">
                                        {/* Weights Details */}
                                        <div className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 leading-normal">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span>Total weight: {totalWeight}g</span>
                                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-mono shrink-0">
                                              {item.source === 'label' ? '🏷️' : '👁️'}
                                            </span>
                                          </div>
                                          {portionWeight && <div>Portion weight: {portionWeight}g</div>}
                                        </div>

                                        {/* Nutrients Calculations */}
                                        {nutrientsToDisplay.length > 0 && (
                                          <div className="space-y-1 pt-1 w-full">
                                            <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                              Nutrients (Exact)
                                            </div>
                                            <div className="flex flex-col gap-0.5 w-full">
                                              {nutrientsToDisplay.map((nut, idx) => (
                                                <div key={idx} className="text-[9.5px] font-mono text-slate-700 dark:text-slate-300 leading-tight">
                                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{nut.label}: </span>
                                                  <span>
                                                    {nut.showMath ? (
                                                      <>
                                                        {nut.value}*{multiplierStr} = <strong className="text-slate-900 dark:text-white">{nut.calc}</strong>{nut.unit}
                                                      </>
                                                    ) : (
                                                      <>
                                                        <strong className="text-slate-900 dark:text-white">{nut.value}</strong>{nut.unit}
                                                      </>
                                                    )}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                            })}
                          </div>
                        );
                      })()}
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
                        {msg.data?.pendingFoodLog.cookingMethod && (
                          <p><strong className="text-slate-900 dark:text-white">🍳 Cooking Method & Seasoning:</strong> {msg.data?.pendingFoodLog.cookingMethod}</p>
                        )}
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
