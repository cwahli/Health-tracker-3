import { NutritionLabelTable } from "./NutritionLabelTable";
import { trackApiCall } from '../../utils/apiTracker';
import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2, Eye, Camera } from 'lucide-react';
import ImageSlider from '../ImageSlider';
import { NutrientPieChart } from '../NutrientPieChart';

import { nutrientDefinitions } from '../../utils/nutrition';
import { PRIMARY_NUTRIENTS } from '../../utils/nutrients';
import { FoodLog } from '../../types';
import { resolveFoodImage } from '../../utils/imageResolver';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomableImage } from '../ZoomableImage';
import { FoodScoutItemPreview, OnlineFoodImage } from './FoodScoutItemPreview';

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
      return "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&auto=format&fit=crop&q=60"; // Mediterranean European dining
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


export const FoodCard: React.FC<AgentCardProps & {
  isSelectingMode?: boolean;
  setIsSelectingMode?: (val: boolean) => void;
  onEnterSelectingMode?: () => void;
  selectedItemKeys?: string[];
  setSelectedItemKeys?: (val: string[] | ((prev: string[]) => string[])) => void;
  actionRef?: React.MutableRefObject<any>;
}> = (props) => {
  const {
    msg, messages, report, foodLogs, t, formatNutrientValue,
    onLogFood, setLoggedMessageIds, loggedMessageIds, profile, handleSend,
    setInputText, fileInputRef
  } = props;

  const [expandedTables, setExpandedTables] = React.useState<Record<string, boolean>>({});
  const [expandedScouts, setExpandedScouts] = React.useState<Record<string, boolean>>({});
  const [fullScreenImg, setFullScreenImg] = React.useState<{ src: string, boundingBox?: number[], foodName?: string, navItems?: { src: string, boundingBox?: number[], foodName?: string }[], navIndex?: number } | null>(null);

  const [searchModes, setSearchModes] = React.useState<Record<string, boolean>>({});
  const [searchedItemIndices, setSearchedItemIndices] = React.useState<Record<string, number>>({});
  const [searchResults, setSearchResults] = React.useState<Record<string, Array<{title: string, imageUrl: string, pageUrl: string}>>>({});
  const [searchLoading, setSearchLoading] = React.useState<Record<string, boolean>>({});
  const [brokenSearchImages, setBrokenSearchImages] = React.useState<Record<string, true>>({});
  const [searchPreview, setSearchPreview] = React.useState<{ groupKey: string, index: number } | null>(null);

  const [groupExpanded, setGroupExpanded] = React.useState<Record<string, boolean>>({});
  const [showTranslations, setShowTranslations] = React.useState<Record<string, boolean>>({});
  const [warningsDismissed, setWarningsDismissed] = React.useState(false);
  const [reviewsOpen, setReviewsOpen] = React.useState<boolean>(true);

  const [confirmedScoutIndices, setConfirmedScoutIndices] = React.useState<Set<number>>(new Set());

  const activeScoutItems = React.useMemo(() => {
    let items = [];
    if (msg.data?.agentResult?.scoutData?.items && Array.isArray(msg.data.agentResult.scoutData.items)) items = msg.data.agentResult.scoutData.items;
    else if (msg.data?.scoutData?.items && Array.isArray(msg.data.scoutData.items)) items = msg.data.scoutData.items;
    else if (msg.data?.scoutItems && msg.data.scoutItems.length > 0) items = msg.data.scoutItems;
    else {
      for (let mIdx = (messages ? messages.length - 1 : -1); mIdx >= 0; mIdx--) {
        if (messages[mIdx].data?.scoutItems && messages[mIdx].data.scoutItems.length > 0) {
          items = messages[mIdx].data.scoutItems;
          break;
        }
      }
    }
    
    if (confirmedScoutIndices.size > 0) {
      return items.map((item: any, i: number) => {
        if (confirmedScoutIndices.has(i) || confirmedScoutIndices.has(item.scoutIndex)) {
          return {
            ...item,
            itemConfidence: 'High',
            _preservedAnomalyFlags: item.anomalyFlags,
            anomalyFlags: []
          };
        }
        return item;
      });
    }
    
    return items;
  }, [msg.data, messages, confirmedScoutIndices]);

  const displayedScoutItems = React.useMemo(() => {
    const breakdown = msg.data?.pendingFoodLog?.itemsBreakdown;
    if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
      return activeScoutItems;
    }
    return activeScoutItems.filter(s => {
      return breakdown.some(b => {
        const cleanB = (b.name || '').toLowerCase().trim();
        const cleanKeyword = (s.keyword || '').toLowerCase().trim();
        const cleanOrig = (s.originalName || '').toLowerCase().trim();
        const cleanName = (s.name || '').toLowerCase().trim();
        return (
          cleanB === cleanKeyword ||
          cleanB === cleanOrig ||
          cleanB === cleanName ||
          cleanB.includes(cleanKeyword) ||
          cleanKeyword.includes(cleanB) ||
          (cleanOrig && (cleanB.includes(cleanOrig) || cleanOrig.includes(cleanB)))
        );
      });
    });
  }, [activeScoutItems, msg.data?.pendingFoodLog?.itemsBreakdown]);

  // Selection hooks for Card-Wide Multi-Select
  const [_isSelectingMode, _setIsSelectingMode] = React.useState<boolean>(false);
  const [_selectedItemKeys, _setSelectedItemKeys] = React.useState<string[]>([]); // stores "groupIdx-itemIdx"
  
  // Wrapper variables prioritizing synchronized props from LogChat, falling back to local state
  const isSelectingMode = props.isSelectingMode !== undefined ? props.isSelectingMode : _isSelectingMode;
  const setIsSelectingMode = props.setIsSelectingMode !== undefined ? props.setIsSelectingMode : _setIsSelectingMode;
  const selectedItemKeys = props.selectedItemKeys !== undefined ? props.selectedItemKeys : _selectedItemKeys;
  const setSelectedItemKeys = props.setSelectedItemKeys !== undefined ? props.setSelectedItemKeys : _setSelectedItemKeys;

  const [selectorError, setSelectorError] = React.useState<string>("");
  const [searchErrors, setSearchErrors] = React.useState<Record<string, string>>({});
  

  const [previewState, setPreviewState] = React.useState<{ groupIdx: number, itemIdx: number, resolvedImgSrc?: string, overrideSrc?: string } | null>(null);
  const [scoutPreviewIdx, setScoutPreviewIdx] = React.useState<number | null>(null);
  const [externalPreviewImg, setExternalPreviewImg] = React.useState<{ url: string; title: string } | null>(null);

  // Card-wide parent image search state hooks
  const [onlineImageUrls, setOnlineImageUrls] = React.useState<Record<string, string>>({});
  const [showMenuImages, setShowMenuImages] = React.useState<Record<string, boolean>>({});
  const [fetchingGroupImages, setFetchingGroupImages] = React.useState<Record<string, boolean>>({});

  const handleFoodSearch = async (groupIdx: number, itemIdx: number, query: string) => {
    const groupKey = `${msg.id}-${groupIdx}`;
    const itemKey = `${msg.id}-${groupIdx}-${itemIdx}`;
    
    setSearchedItemIndices(prev => ({ ...prev, [itemKey]: itemIdx }));
    setSearchModes(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${groupKey}-`) && k !== itemKey) {
          next[k] = false;
        }
      });
      next[itemKey] = true;
      return next;
    });
    
    if (searchResults[itemKey] && searchResults[itemKey].length > 0) {
      return;
    }

    setSearchLoading(prev => ({ ...prev, [itemKey]: true }));
    setSearchErrors(prev => ({ ...prev, [itemKey]: "" }));
    try {
      trackApiCall('brave', `Brave Image Search (Manual) - ${query}`);
      const response = await fetch("/api/gemini/food-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setSearchResults(prev => ({ ...prev, [itemKey]: data.images.slice(0, 5) }));
      } else {
        setSearchResults(prev => ({ ...prev, [itemKey]: [] }));
        setSearchErrors(prev => ({ ...prev, [itemKey]: data.error || "No images returned." }));
      }
    } catch (e: any) {
      console.error("Search error:", e);
      setSearchResults(prev => ({ ...prev, [itemKey]: [] }));
      setSearchErrors(prev => ({ ...prev, [itemKey]: e.message || "Failed to load Google Search API." }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [itemKey]: false }));
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

  const historicalMsgWithImages = React.useMemo(() => {
    if (messages) {
      for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
        const m = messages[mIdx];
        if ((m.imageUrls && m.imageUrls.length > 0) || m.imageUrl || m.data?.pendingFoodLog?.imageUrls) {
          return m;
        }
      }
    }
    return null;
  }, [messages]);

  const resolvedMessageImages = React.useMemo(() => {
    return messageImages.length > 0 
      ? messageImages 
      : (historicalMsgWithImages?.data?.pendingFoodLog?.imageUrls || historicalMsgWithImages?.data?.imageUrls || []);
  }, [messageImages, historicalMsgWithImages]);

  const resolvedScoutItems = React.useMemo(() => {
    return msg.data?.scoutItems && msg.data.scoutItems.length > 0
      ? msg.data.scoutItems
      : (historicalMsgWithImages?.data?.scoutItems || []);
  }, [msg.data?.scoutItems, historicalMsgWithImages]);

  const getNutrientFromTable = (comparisonTable: any, nutrientNameQuery: string, foodIdx: number): string | null => {
    if (!comparisonTable || !comparisonTable.rows) return null;
    const row = comparisonTable.rows.find((r: any) => 
      r.nutrient && r.nutrient.toLowerCase().includes(nutrientNameQuery.toLowerCase())
    );
    if (!row || !row.values || row.values.length <= foodIdx) return null;
    return row.values[foodIdx];
  };

  const PROFILE_TOP_NUTRIENTS = React.useMemo(() => {
    const list = profile?.topNutrientsToMonitor || ['calories', 'saturatedFat', 'sodium'];
    return list.map(n => n.toLowerCase().replace(/\s+/g, ''));
  }, [profile?.topNutrientsToMonitor]);

  const displayGroups = React.useMemo(() => {
    if (!msg.data?.agentResult?.comparison?.groups) return [];
    
    const rawGroups = [...msg.data.agentResult.comparison.groups];
    
    // Sort logic helper
    const getSuitabilityScore = (suitability: string): number => {
      const s = suitability.toLowerCase();
      const isNegatedPositive = /not\s+(recommended|safe|good|best|low|least|safest|perfect)/i.test(s);
      const isNegativeLeast = /least\s+(suitable|recommended|safe|good|healthy|beneficial|ideal)/i.test(s);
      
      if (s.includes('bad') || s.includes('avoid') || s.includes('high risk') || s.includes('severe') || s.includes('red') || s.includes('strongly discouraged') || s.includes('extremely harmful') || isNegatedPositive || s.includes('worst')) return 0;
      if (s.includes('best') || s.includes('safest') || s.includes('recommended') || s.includes('perfect')) return 3;
      if (s.includes('good') || s.includes('safe') || s.includes('low risk') || s.includes('limit')) return 2;
      if (s.includes('moderate') || s.includes('medium') || s.includes('caution') || s.includes('amber')) return 1;
      return 0;
    };
    
    // The backend LLM is strictly instructed to return groups in tiered order (Tier 1, Tier 2, Tier 3).
    // Do NOT resort them here, as string-based scoring is fragile.
    
    // Enrich each group's items with boundingBox2D and sourceImageIndex from scoutItems
    const groups = rawGroups.map((g: any) => {
      const items = (g.items || []).map((item: any) => {
        const matchingScout = (msg.data?.scoutItems || []).find((s: any) => {
          const itemName = (item.name || "").toLowerCase();
          const sKw = (s.keyword || "").toLowerCase();
          const sOrig = (s.originalName || "").toLowerCase();
          return (
            (itemName && sKw && (itemName.includes(sKw) || sKw.includes(itemName))) ||
            (itemName && sOrig && (itemName.includes(sOrig) || sOrig.includes(itemName))) ||
            (itemName.split(' ')[0] === sKw.split(' ')[0])
          );
        }) || (msg.data?.scoutItems || []).find((s: any) => {
          const gName = (g.groupName || "").toLowerCase();
          const sKw = (s.keyword || "").toLowerCase();
          const sOrig = (s.originalName || "").toLowerCase();
          return (
            (gName && sKw && (gName.includes(sKw) || sKw.includes(gName))) ||
            (gName && sOrig && (gName.includes(sOrig) || sOrig.includes(gName))) ||
            (gName.split(' ')[0] === sKw.split(' ')[0])
          );
        });

        return {
          ...item,
          boundingBox2D: item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null),
          sourceImageIndex: typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0),
          confidenceRating: item.confidenceRating,
          confidenceComment: item.confidenceComment
        };
      });

      // If group has no items, create a default item so it can be previewed
      const finalItems = items.length > 0 ? items : [
        {
          name: g.groupName,
          boundingBox2D: null,
          sourceImageIndex: 0
        }
      ].map(item => {
        const matchingScout = (msg.data?.scoutItems || []).find((s: any) => {
          const gName = (g.groupName || "").toLowerCase();
          const sKw = (s.keyword || "").toLowerCase();
          const sOrig = (s.originalName || "").toLowerCase();
          return (
            (gName && sKw && (gName.includes(sKw) || sKw.includes(gName))) ||
            (gName && sOrig && (gName.includes(sOrig) || sOrig.includes(gName))) ||
            (gName.split(' ')[0] === sKw.split(' ')[0])
          );
        });
        return {
          ...item,
          boundingBox2D: matchingScout ? matchingScout.boundingBox2D : null,
          sourceImageIndex: matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0
        };
      });

      return {
        ...g,
        items: finalItems
      };
    });

    return groups;
  }, [msg.data, profile?.topNutrientsToMonitor]);

  // Function to parallel-fetch all text menu images in complete mode
  const fetchGroupMenuImages = async (groupIdx: number) => {
    const group = displayGroups[groupIdx];
    if (!group || !group.items) return;
    
    const groupKey = `${msg.id}-${groupIdx}`;
    setFetchingGroupImages(prev => ({ ...prev, [groupKey]: true }));
    setShowMenuImages(prev => ({ ...prev, [groupKey]: true }));
    
    const promises = group.items.map(async (item: any, itemIdx: number) => {
      const itemKey = `${msg.id}-${groupIdx}-${itemIdx}`;
      if (onlineImageUrls[itemKey]) return;
      
      try {
        const res = await fetch("/api/gemini/food-image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: item.name, mode: "complete" })
        });
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          setOnlineImageUrls(prev => ({
            ...prev,
            [itemKey]: data.images[0].imageUrl
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch menu image for", item.name, err);
      }
    });
    
    await Promise.all(promises);
    setFetchingGroupImages(prev => ({ ...prev, [groupKey]: false }));
  };

  // Register parent Action handlers
  React.useEffect(() => {
    if (props.actionRef && props.isSelectingMode) {
      props.actionRef.current = {
        triggerImageSearch: (keys: string[]) => {
          setSelectorError("");
          keys.forEach(key => {
            const [gIdx, iIdx] = key.split('-').map(Number);
            const name = displayGroups[gIdx]?.items?.[iIdx]?.name;
            if (name) {
              handleFoodSearch(gIdx, iIdx, name);
            }
          });
        },

        triggerFetchMenuImages: async (keys: string[]) => {
          setSelectorError("");
          const promises = keys.map(async (key) => {
            const [gIdx, iIdx] = key.split('-').map(Number);
            const group = displayGroups[gIdx];
            if (!group || !group.items) return;
            const item = group.items[iIdx];
            if (!item) return;

            const itemKey = `${msg.id}-${gIdx}-${iIdx}`;
            const groupKey = `${msg.id}-${gIdx}`;

            setFetchingGroupImages(prev => ({ ...prev, [itemKey]: true }));
            setShowMenuImages(prev => ({ ...prev, [itemKey]: true }));

            try {
              trackApiCall('brave', `Brave Image Search (Targeted Menu Lookup) - ${item.name}`);
              const res = await fetch("/api/gemini/food-image-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: item.name, mode: "complete" })
              });
              const data = await res.json();
              if (data.images && data.images.length > 0) {
                setOnlineImageUrls(prev => ({
                  ...prev,
                  [itemKey]: data.images[0].imageUrl
                }));
              }
            } catch (err) {
              console.warn("Failed to fetch targeted menu image for", item.name, err);
            } finally {
              setFetchingGroupImages(prev => ({ ...prev, [itemKey]: false }));
            }
          });
          await Promise.all(promises);
        },

        triggerCompareFood: (keys: string[]) => {
          setSelectorError("");
          const selectedNames = keys.map(key => {
            const [gIdx, iIdx] = key.split('-').map(Number);
            return displayGroups[gIdx]?.items?.[iIdx]?.name;
          });
          if (handleSend) {
            handleSend({
              text: `Compare these specific menu items: ${selectedNames.join(', ')}. Rank them best-to-worst based on my health targets.`,
              compareOnly: true,
              compareItems: selectedNames,
              sourceMsgId: msg.id
            });
          }
        }
      };
    }
  }, [props.actionRef, props.isSelectingMode, displayGroups, handleSend, msg.id]);

  return (
    <>
      {msg.data?.agentResult && msg.data?.agentResult.mode === 'evaluation' && msg.data?.agentResult.comparison && (
                    <div className="space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden bg-transparent">
                      {msg.data.correctionOf && (
                         <div className="flex justify-center pb-2">
                           <button 
                             onClick={() => {
                               // Assuming the bubble has an ID like 'chat-message-' + msg.id, 
                               // but scrolling to the container is safer
                               window.scrollTo({ top: 0, behavior: 'smooth' });
                             }}
                             className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                           >
                             <ChevronUp className="w-3 h-3" />
                             Scroll to top
                           </button>
                         </div>
                      )}
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

                      {/* Shared Scout Items Row for Comparison Mode */}
                      {activeScoutItems.length > 0 && (
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 mb-2">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                               <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                               Identified Ingredients
                             </div>
                           </div>
                           <div className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full font-sans">
                             {activeScoutItems.map((item: any, i: number) => {
                               const imgIdx = typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : 0;
                               const resolvedImgSrc = (messageImages.length > 0)
                                 ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                 : getFoodImageUrl(item.keyword);
                               return (
                                 <div key={i} className="flex flex-col items-center gap-1 shrink-0 snap-align-start w-[72px] relative group">
                                   <div className="relative">
                                     <div 
                                       className={`w-[72px] h-[72px] rounded-xl overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                                         (item.itemConfidence?.toLowerCase().includes('low') || item.itemConfidence?.toLowerCase().includes('medium')) 
                                           ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 shadow-amber-500/20'
                                           : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50'
                                       }`}
                                       onClick={() => setScoutPreviewIdx(i)}
                                     >
                                       {item.boundingBox2D ? (
                                         <CroppedFoodImage 
                                           src={resolvedImgSrc} 
                                           boundingBox={item.boundingBox2D} 
                                           alt={item.keyword} 
                                           className="w-full h-full object-cover"
                                           imageUrls={messageImages}
                                           sourceImageIndex={imgIdx}
                                         />
                                       ) : (
                                         <img 
                                           src={resolvedImgSrc} 
                                           alt={item.keyword} 
                                           className="w-full h-full object-cover"
                                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80&auto=format'; }}
                                         />
                                       )}
                                     </div>
                                     {(item.itemConfidence?.toLowerCase().includes('low') || item.itemConfidence?.toLowerCase().includes('medium')) && (
                                       <div 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setReviewsOpen(true);
                                         }}
                                         className="absolute -top-1.5 -right-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10 cursor-pointer hover:scale-110 transition-transform"
                                         title="Show low confidence identification panel"
                                       >
                                         <span className="text-[10px] font-bold">!</span>
                                       </div>
                                     )}
                                   </div>
                                   <span className="text-[9px] text-center font-medium leading-tight text-slate-500 truncate w-full font-sans">
                                     {showTranslations.scout ? (item.keyword || item.originalName) : (item.originalName || item.keyword)}
                                   </span>
                                   {item.anomalyFlags && item.anomalyFlags.length > 0 && (
                                     <span className="text-[8px] text-center leading-tight text-amber-600 dark:text-amber-500 w-full font-sans line-clamp-2">
                                       {item.anomalyFlags.join(', ')}
                                     </span>
                                   )}
                                 </div>
                               );
                             })}
                           </div>

                           {/* Uncertain Items Helper Button */}
                           {reviewsOpen && activeScoutItems.some((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0)) && (
                             <div className="mt-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-2 font-sans relative">
                               <button 
                                 onClick={() => setReviewsOpen(false)}
                                 className="absolute top-1.5 right-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-0.5 rounded-full hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                                 title="Close panel"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                               <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 pr-6">
                                 <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                 <div className="flex flex-col">
                                   <span className="text-[11px] font-bold leading-tight">Low confidence identification</span>
                                   <span className="text-[10px] font-medium leading-tight">
                                     {activeScoutItems
                                        .filter((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0))
                                        .map((i: any) => i.originalName || i.keyword || i.name)
                                        .join(', ')}
                                   </span>
                                 </div>
                               </div>
                               <div className="flex gap-2">
                                 <button 
                                   onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                                   className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                 >
                                   Edit Item
                                 </button>
                                 <button 
                                   onClick={() => { 
                                      const idx = activeScoutItems[0]?.scoutIndex ?? 0;
                                      setConfirmedScoutIndices(prev => new Set([...prev, idx]));
                                   }} 
                                   className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                 >
                                   This is correct
                                 </button>
                               </div>
                             </div>
                           )}
                        </div>
                      )}

                      {(msg.content || msg.data?.agentResult?.message) && (
                        <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-left pb-3 whitespace-pre-line break-words">
                          {typeof (msg.content || msg.data?.agentResult?.message) === 'object' 
                            ? JSON.stringify(msg.content || msg.data?.agentResult?.message) 
                            : (msg.content || msg.data?.agentResult?.message)}
                        </div>
                      )}

                      {/* Foods Comparison Cards - Horizontally Scrollable (200px wide, borderless, separated by vertical dividers with 10px spacing) */}
                      <div className="flex gap-0 mt-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full overscroll-x-contain">
                        {displayGroups.map((group: any, idx: number) => {
                          const lowerSuit = String(group.suitability || '').toLowerCase();
                          const isBest = lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('recommended') || lowerSuit.includes('good') || lowerSuit.includes('perfect');
                          
                          let suitabilityClass = "text-slate-700 dark:text-slate-300";
                          let suitabilityBadgeBg = "bg-slate-100 dark:bg-slate-800";
                          const isNegatedPositive = /not\s+(recommended|safe|good|best|low|least|safest|perfect)/i.test(lowerSuit);
                          const isNegativeLeast = /least\s+(suitable|recommended|safe|good|healthy|beneficial|ideal)/i.test(lowerSuit);
                          const isBetter = lowerSuit.includes('better') && !/better\s+to\s+avoid/i.test(lowerSuit);
                          
                          if (lowerSuit.includes('bad') || lowerSuit.includes('avoid') || lowerSuit.includes('high risk') || lowerSuit.includes('severe') || lowerSuit.includes('red') || lowerSuit.includes('strongly discouraged') || lowerSuit.includes('extremely harmful') || lowerSuit.includes('extremely') || lowerSuit.includes('discouraged') || isNegatedPositive || lowerSuit.includes('worst')) {
                            suitabilityClass = "text-rose-700 dark:text-rose-400";
                            suitabilityBadgeBg = "bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50";
                          } else if (lowerSuit.includes('moderate') || lowerSuit.includes('medium') || lowerSuit.includes('caution') || lowerSuit.includes('amber') || lowerSuit.includes('yellow') || lowerSuit.includes('acceptable') || lowerSuit.includes('limited') || lowerSuit.includes('occasional') || isNegativeLeast) {
                            suitabilityClass = "text-amber-700 dark:text-amber-400";
                            suitabilityBadgeBg = "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50";
                          } else if (lowerSuit.includes('good') || lowerSuit.includes('safe') || lowerSuit.includes('best') || lowerSuit.includes('low risk') || lowerSuit.includes('least harmful') || lowerSuit.includes('safest') || lowerSuit.includes('recommended') || isBetter) {
                            suitabilityClass = "text-emerald-700 dark:text-emerald-400";
                            suitabilityBadgeBg = "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50";
                          }

                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && (
                                <div className="w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch my-2 shrink-0 mx-[10px]" />
                              )}
                              <div className="w-[80%] sm:w-[320px] shrink-0 snap-align-start flex flex-col relative space-y-3">
                                
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
                                {/* Group Hero Image: Use first associated item crop/image, otherwise fallback to online search */}
                                <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm relative shrink-0">
                                  {(() => {
                                    const firstItem = group.items?.[0];
                                    
                                    // Look back in messages history to find original uploads containing images
                                    const historicalMsgWithImages = (() => {
                                      const currentImgs = msg.data?.pendingFoodLog?.imageUrls || msg.data?.imageUrls || [];
                                      if (currentImgs.length > 0) return msg;
                                      if (messages) {
                                        for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
                                          const m = messages[mIdx];
                                          const mImages = m.data?.pendingFoodLog?.imageUrls || m.data?.imageUrls || [];
                                          if (mImages.length > 0) return m;
                                        }
                                      }
                                      return null;
                                    })();
                                    const resolvedMessageImages = messageImages.length > 0 
                                      ? messageImages 
                                      : (historicalMsgWithImages?.data?.pendingFoodLog?.imageUrls || historicalMsgWithImages?.data?.imageUrls || []);
                                    const resolvedScoutItems = msg.data?.scoutItems && msg.data.scoutItems.length > 0
                                      ? msg.data.scoutItems
                                      : (historicalMsgWithImages?.data?.scoutItems || []);

                                    if (firstItem) {
                                      // Find matching scout item
                                      const matchingScout = (resolvedScoutItems || []).find((s: any) => 
                                        (firstItem.name || "").toLowerCase().includes((s.keyword || "").toLowerCase()) || 
                                        (s.keyword || "").toLowerCase().includes((firstItem.name || "").toLowerCase()) ||
                                        (firstItem.name || "").toLowerCase().split(' ')[0] === (s.keyword || "").toLowerCase().split(' ')[0]
                                      );
                                      const imgIdx = typeof firstItem.sourceImageIndex === 'number' 
                                        ? firstItem.sourceImageIndex 
                                        : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
                                      const resolvedImgSrc = (resolvedMessageImages.length > 0)
                                        ? resolvedMessageImages[imgIdx >= 0 && imgIdx < resolvedMessageImages.length ? imgIdx : 0]
                                        : getFoodImageUrl(firstItem.name, '');
                                      const bb = firstItem.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);

                                      if (bb && bb.length === 4) {
                                        const activeScoutIdx = activeScoutItems.findIndex((s: any) => s.keyword === (matchingScout?.keyword || firstItem.name));
                                        return (
                                          <CroppedFoodImage 
                                            src={resolvedImgSrc} 
                                            boundingBox={bb} 
                                            alt={firstItem.name} 
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                            imageUrls={resolvedMessageImages}
                                            sourceImageIndex={imgIdx}
                                            onTap={() => {
                                              if (activeScoutIdx !== -1) {
                                                setScoutPreviewIdx(activeScoutIdx);
                                              } else {
                                                setPreviewState({ groupIdx: idx, itemIdx: 0, resolvedImgSrc });
                                              }
                                            }}
                                          />
                                        );
                                      } else {
                                        return (
                                          <img 
                                            src={resolvedImgSrc} 
                                            alt={firstItem.name} 
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => {
                                              setPreviewState({ groupIdx: idx, itemIdx: 0, resolvedImgSrc });
                                            }}
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80&auto=format'; }}
                                          />
                                        );
                                      }
                                    }
                                    
                                    // Fallback to stock online image if no visual is available
                                    return (
                                      <OnlineFoodImage 
                                        foodName={(group.items?.[0]?.name?.replace(/^\[.*?\]\s*/, '')) || group.groupName || "food"} 
                                        fallbackSrc={getFoodImageUrl(group.items?.[0]?.name?.replace(/^\[.*?\]\s*/, '') || "food")} 
                                        className="w-full h-full object-cover"
                                        searchMode="light"
                                      />
                                    );
                                  })()}
                                </div>
                                
                                                                {(() => {
                                  let groupScoutItems = (group.scoutItemIndices && group.scoutItemIndices.length > 0)
                                    ? group.scoutItemIndices.map((i: number) => activeScoutItems[i]).filter(Boolean)
                                    : [];
                                  
                                  if (groupScoutItems.length === 0 && group.items && group.items.length > 0) {
                                    groupScoutItems = activeScoutItems.filter(s => {
                                      return group.items.some((gi: any) => 
                                        gi.name === s.keyword || 
                                        gi.name === s.originalName ||
                                        (gi.name && s.keyword && gi.name.toLowerCase().includes(s.keyword.toLowerCase()))
                                      );
                                    });
                                  }
                                    
                                  if (groupScoutItems.length > 0) {
                                    return <NutritionLabelTable defaultOpen={false} activeScoutItems={groupScoutItems} onConfirmItem={(idx) => setConfirmedScoutIndices(prev => new Set(prev).add(idx))} />;
                                  }

                                  // No real scout items for this group (e.g. a text-only comparison with no
                                  // image). group.averageNutrients is an AI estimate, not a printed label, so
                                  // it must never be shown as a "nutrition label" — it's already surfaced
                                  // correctly in the "Top Nutrients for Mode D" bar directly below.
                                  return null;

                                  return null;
                                })()}
                                 {/* Top Nutrients for Mode D */}
                                {group.averageNutrients && Object.keys(group.averageNutrients).length > 0 && (
                                  <div className="py-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <div className="flex flex-wrap gap-2 justify-start pb-2">
                                      {(() => {
                                        const defaultTargets: { [key: string]: number } = { calories: 2000, saturatedFat: 15, sodium: 1200, addedSugar: 30, totalFat: 65, protein: 50, carbohydrates: 250, totalFibre: 30 };
                                        const nutrientColors: { [key: string]: string } = { calories: 'rgb(249, 115, 22)', saturatedFat: 'rgb(234, 179, 8)', sodium: 'rgb(34, 197, 94)', addedSugar: 'rgb(239, 68, 68)', totalFat: 'rgb(168, 85, 247)', protein: 'rgb(59, 130, 246)', carbohydrates: 'rgb(6, 182, 212)', totalFibre: 'rgb(16, 185, 129)' };
                                        const nutrientLabels: { [key: string]: string } = { calories: 'Calories', saturatedFat: 'Sat Fat', sodium: 'Sodium', addedSugar: 'Added Sugar', totalFat: 'Total Fat', protein: 'Protein', carbohydrates: 'Carbs', totalFibre: 'Fiber' };
                                        const nutrientUnits: { [key: string]: string } = { calories: 'kcal', saturatedFat: 'g', sodium: 'mg', addedSugar: 'g', totalFat: 'g', protein: 'g', carbohydrates: 'g', totalFibre: 'g' };
                                        const formatNutrientValue = (v: number, u: string) => {
                                          if (v === null || v === undefined || isNaN(v)) return `—${u}`;
                                          const abs = Math.abs(v);
                                          if (abs >= 1000) return `${(v / 1000).toFixed(2)}k${u}`;
                                          if (abs >= 100) return `${Math.round(v)}${u}`;
                                          if (abs >= 10) return `${v.toFixed(1)}${u}`;
                                          return `${v.toFixed(2)}${u}`;
                                        };
                                        
                                        // Respect the user's selected primary nutrients from their profile (defaults to calories, saturatedFat, sodium) to stay consistent with Mode A
                                        const activeKeys = profile?.topNutrientsToMonitor || ['calories', 'saturatedFat', 'sodium'];
                                        const keysToRender = activeKeys.filter(k => group.averageNutrients[k] !== undefined && group.averageNutrients[k] !== null);

                                        return keysToRender.map(key => {
                                          let val = group.averageNutrients[key];
                                          let parsedVal = typeof val === 'string' ? parseFloat(val.replace(/[^\d.]/g, '')) : val;
                                          if (isNaN(parsedVal)) return null;
                                          
                                          // Fallback for past messages where agent might have output 0 because of localized keys (e.g. Lemak Jenuh)
                                          if (parsedVal === 0 && group.scoutItemIndices && group.scoutItemIndices.length === 1) {
                                            const scoutItem = activeScoutItems[group.scoutItemIndices[0]];
                                            if (scoutItem && scoutItem.rawNutritionLabel) {
                                              const rawK = Object.keys(scoutItem.rawNutritionLabel).find(k => 
                                                k.toLowerCase().includes(key.toLowerCase()) || 
                                                (key === 'saturatedFat' && (k.toLowerCase().includes('sat') || k.toLowerCase().includes('jenuh'))) ||
                                                (key === 'sodium' && (k.toLowerCase().includes('garam') || k.toLowerCase().includes('natrium')))
                                              );
                                              if (rawK) {
                                                const match = String(scoutItem.rawNutritionLabel[rawK]).match(/[\d.]+/);
                                                if (match) {
                                                  let multiplier = 1;
                                                  const estimatedWeight = scoutItem.estimatedWeightGrams || 100;
                                                  if (scoutItem.rawNutritionLabel.servingSize || scoutItem.rawNutritionLabel.takaranSaji) {
                                                    const ssMatch = String(scoutItem.rawNutritionLabel.servingSize || scoutItem.rawNutritionLabel.takaranSaji).match(/[\d.]+/);
                                                    if (ssMatch) multiplier = estimatedWeight / parseFloat(ssMatch[0]);
                                                    else multiplier = estimatedWeight / 100;
                                                  } else {
                                                    multiplier = estimatedWeight / 100;
                                                  }
                                                  parsedVal = parseFloat(match[0]) * multiplier;
                                                }
                                              }
                                            }
                                          }
                                          
                                          // group.averageNutrients already holds the group's real/average total
                                          // nutrient values (not a per-100g figure) — no weight-based scaling here.
                                          const totalVal = parsedVal;
                                          
                                          const color = nutrientColors[key] || 'rgb(100, 116, 139)';
                                          const label = nutrientLabels[key] || (key.replace(/([A-Z])/g, ' $1').trim());
                                          const unit = nutrientUnits[key] || 'g';

                                          return (
                                            <div key={key} className="flex items-center gap-1.5">
                                              <NutrientPieChart
                                                allowance={profile?.targets?.[key as any] ?? defaultTargets[key]}
                                                alreadyConsumed={0}
                                                mealValue={totalVal}
                                                nutrientKey={key as any}
                                                size="sm"
                                              />
                                              <span className={key === 'calories' ? "text-[11px] font-extrabold" : "text-[11px] font-bold"} style={{ color }}>
                                                {key === 'calories' ? '' : `${label}: `}{formatNutrientValue(totalVal, unit)}
                                              </span>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Recommendation */}
                                <div className="space-y-1.5 pt-1">
                                  {group.recommendation && (
                                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-md border border-slate-100 dark:border-slate-800">
                                      {group.recommendation}
                                    </p>
                                  )}
                                </div>
                                                         {/* Items in this bucket */}
                                 <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                   {(() => {
                                     const scoutType = (msg.data?.scoutContentType || '').toLowerCase();
                                     const isMenuOrPoster = scoutType === 'text' || scoutType === 'menu_or_poster';
                                     const isVisualOrPosted = scoutType === 'visual_or_posted';
                                     
                                     // Look back in messages history to find original uploads containing images
                                     const historicalMsgWithImages = (() => {
                                       const currentImgs = msg.data?.pendingFoodLog?.imageUrls || msg.data?.imageUrls || [];
                                       if (currentImgs.length > 0) return msg;
                                       if (messages) {
                                         for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
                                           const m = messages[mIdx];
                                           const mImages = m.data?.pendingFoodLog?.imageUrls || m.data?.imageUrls || [];
                                           if (mImages.length > 0) return m;
                                         }
                                       }
                                       return null;
                                     })();
                                     const resolvedMessageImages = messageImages.length > 0 
                                       ? messageImages 
                                       : (historicalMsgWithImages?.data?.pendingFoodLog?.imageUrls || historicalMsgWithImages?.data?.imageUrls || []);
                                     const resolvedScoutItems = msg.data?.scoutItems && msg.data.scoutItems.length > 0
                                       ? msg.data.scoutItems
                                       : (historicalMsgWithImages?.data?.scoutItems || []);
                                     // 1. Precompute groupPreviewItems
                                     const groupPreviewItems = (group.items || []).map((item: any) => {
                                       const matchingScout = (resolvedScoutItems || []).find((s: any) => 
                                         (item.name || "").toLowerCase().includes((s.keyword || "").toLowerCase()) || 
                                         (s.keyword || "").toLowerCase().includes((item.name || "").toLowerCase()) ||
                                         (item.name || "").toLowerCase().split(' ')[0] === (s.keyword || "").toLowerCase().split(' ')[0]
                                       );
                                       const imgIdx = typeof item.sourceImageIndex === 'number' 
                                         ? item.sourceImageIndex 
                                         : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
                                       const resolvedImgSrc = (resolvedMessageImages.length > 0)
                                         ? resolvedMessageImages[imgIdx >= 0 && imgIdx < resolvedMessageImages.length ? imgIdx : 0]
                                         : getFoodImageUrl(item.name, '');
                                       const bb = previewState?.overrideSrc ? null : (item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null));
                                       return { src: resolvedImgSrc, boundingBox: bb, foodName: item.name, imgIdx };
                                     });
                                     // 2. Compute indices of text-only items (force for menu contentType or aspect ratio > 2.2 or height < 20, unless visual_or_posted)
                                     const textOnlyIndices = (group.items || []).map((item: any, itemIdx: number) => {
                                       const bb = groupPreviewItems[itemIdx]?.boundingBox;
                                       const height = bb ? Math.abs(bb[2] - bb[0]) : 0;
                                       const width = bb ? Math.abs(bb[3] - bb[1]) : 0;
                                       const aspect = height > 0 ? width / height : 0;
                                       const isTextOnly = !isVisualOrPosted && (isMenuOrPoster || !bb || bb.length < 4 || aspect > 2.2 || height < 20);
                                       return isTextOnly ? itemIdx : -1;
                                     }).filter(index => index !== -1);
                                      const hasTextOnlyItems = textOnlyIndices.length > 0;
                                      const hasDishesImages = !isMenuOrPoster && groupPreviewItems.some(i => i.boundingBox && i.boundingBox.length === 4);
                                      const groupKey = `${msg.id}-${idx}`;
                                      const hasAnyMenuImage = (group.items || []).some((_, i) => {
                                        const k = `${msg.id}-${idx}-${i}`;
                                        return showMenuImages[k] || !!onlineImageUrls[k];
                                      });
                                      const isGridExpanded = hasDishesImages || showMenuImages[groupKey] || hasAnyMenuImage || isVisualOrPosted;
                                      const isSearchActive = !!searchModes[groupKey];
                                     const resultsForGroup = searchResults[groupKey] || [];
                                     const isLoadingForGroup = !!searchLoading[groupKey];
                                     const searchedItemIdx = searchedItemIndices[groupKey];
                                     const hasTranslations = (group.items || []).some(
                                       (item: any) => item.originalName && item.originalName.trim().length > 0 && item.originalName.toLowerCase() !== (item.keyword || item.name || "").toLowerCase()
                                     );
                                     return (
                                       <>
                                         {/* Label area with Search selector trigger next to it */}
                                         <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between w-full font-sans">
                                           <span>{isSelectingMode ? "Choose food to compare" : "Foods in this group"} ({group.items?.length || 0})</span>
                                           <div className="flex items-center gap-1.5">

                                             {hasTranslations && (
                                               <button
                                                 type="button"
                                                 onClick={() => setShowTranslations(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                                 className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md transition-all cursor-pointer ${
                                                   showTranslations[groupKey] ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                                 }`}
                                                 title="Toggle Language"
                                               >
                                                 <span className="text-[10px] font-bold leading-none block px-0.5 py-[1px]">{showTranslations[groupKey] ? "English" : "Local"}</span>
                                               </button>
                                             )}

                                              <button
                                                type="button"
                                               onClick={() => {
                                                 if (!isSelectingMode && props.onEnterSelectingMode) props.onEnterSelectingMode();
                                                 setIsSelectingMode(!isSelectingMode);
                                                 setSelectedItemKeys([]);
                                                 setSelectorError("");
                                                 // Deactivate standard single-search CSE if running
                                                 setSearchModes(prev => {
                                                   const next = { ...prev };
                                                   Object.keys(next).forEach(k => {
                                                     if (k.startsWith(`${groupKey}-`)) next[k] = false;
                                                   });
                                                   return next;
                                                 });
                                               }}
                                               className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md transition-all cursor-pointer ${
                                                 isSelectingMode ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                               }`}
                                               title={isSelectingMode ? "Exit selection mode" : "Multi-select items for search or comparison"}
                                             >
                                               {isSelectingMode ? <X className="w-3.5 h-3.5 stroke-[2.5px]" /> : <Search className="w-3.5 h-3.5 stroke-[2.5px]" />}
                                             </button>
                                           </div>
                                         </div>
                                         {/* Collapsible container using the GroupItemsContainer */}
                                         <GroupItemsContainer
                                           groupKey={groupKey}
                                           isExpanded={!!groupExpanded[groupKey]}
                                           onToggle={() => setGroupExpanded(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                         >
                                           {/* Search results moved to group level to take full width */}
                                            <div className="w-full flex flex-col gap-4">
                                              {(() => {
                                                const categorizedItems = (group.items || []).reduce((acc: any, item: any, itemIdx: number) => {
                                                  let category = "Uncategorized";
                                                  let rawName = item.name || "";
                                                  const match = rawName.match(/^\[(.*?)\]\s*(.*)$/);
                                                  if (match) {
                                                    category = match[1];
                                                  }
                                                  if (!acc[category]) acc[category] = [];
                                                  acc[category].push({ item, itemIdx });
                                                  return acc;
                                                }, {} as Record<string, {item: any, itemIdx: number}[]>);

                                                return Object.entries(categorizedItems).map(([category, itemsArr]: [string, {item: any, itemIdx: number}[]], catIdx) => (
                                                  <div key={catIdx} className="w-full flex flex-col gap-2">
                                                    {category !== "Uncategorized" && (
                                                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800/50 pb-1 mt-1">
                                                        {category}
                                                      </div>
                                                    )}
                                                    <div className={isGridExpanded ? "grid grid-cols-3 sm:grid-cols-4 gap-3 w-full" : "grid grid-cols-2 gap-2 w-full"}>
                                                      {itemsArr.map(({item, itemIdx}) => {
                                                        const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = groupPreviewItems[itemIdx];
                                                        const isTextOnly = textOnlyIndices.includes(itemIdx);
                                                        const itemKey = `${idx}-${itemIdx}`;
                                                        const fullItemKey = `${msg.id}-${idx}-${itemIdx}`;
                                                        const isSelected = selectedItemKeys.includes(itemKey);
                                                        let itemDisplayName = showTranslations[groupKey] ? (item.keyword || item.name) : (item.originalName || item.name);
                                                        itemDisplayName = itemDisplayName.replace(/^\[.*?\]\s*/, '');

                                                        const itemKeyForCache = `${msg.id}-${idx}-${itemIdx}`;
                                                        const shouldShowAsPreview = !isTextOnly || showMenuImages[groupKey] || showMenuImages[itemKeyForCache] || !!onlineImageUrls[itemKeyForCache] || isVisualOrPosted;
                                                        const finalSrc = onlineImageUrls[itemKeyForCache] || resolvedImgSrc;

                                                        const hasBeenSearched = !!onlineImageUrls[itemKeyForCache] || (searchResults[fullItemKey] && searchResults[fullItemKey].length > 0);

                                                        const chipOnClick = (fetchedUrl?: string) => {
                                                          if (isSelectingMode) {
                                                            setSelectedItemKeys(prev => 
                                                              prev.includes(itemKey) 
                                                                ? prev.filter(k => k !== itemKey) 
                                                                : [...prev, itemKey]
                                                            );
                                                          } else {
                                                            if (searchResults[fullItemKey] && searchResults[fullItemKey].length > 0) {
                                                              setSearchModes(prev => ({...prev, [fullItemKey]: !prev[fullItemKey]}));
                                                            } else {
                                                              setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc, overrideSrc: fetchedUrl && typeof fetchedUrl === 'string' ? fetchedUrl : undefined });
                                                            }
                                                          }
                                                        };

                                                        const itemClinicalThreat = (() => {
                                                          if (!group.itemClinicalThreats) return undefined;
                                                          const matchingScoutIdx = activeScoutItems.findIndex((s: any) => 
                                                            (item.name || "").toLowerCase().includes((s.keyword || "").toLowerCase()) || 
                                                            (s.keyword || "").toLowerCase().includes((item.name || "").toLowerCase()) ||
                                                            (item.name || "").toLowerCase().split(' ')[0] === (s.keyword || "").toLowerCase().split(' ')[0]
                                                          );
                                                          if (matchingScoutIdx !== -1 && group.itemClinicalThreats[matchingScoutIdx] !== undefined) {
                                                            return group.itemClinicalThreats[matchingScoutIdx];
                                                          }
                                                          if (group.itemClinicalThreats[itemIdx] !== undefined) {
                                                            return group.itemClinicalThreats[itemIdx];
                                                          }
                                                          if (group.itemClinicalThreats[item.name] !== undefined) {
                                                            return group.itemClinicalThreats[item.name];
                                                          }
                                                          if (group.itemClinicalThreats[itemDisplayName] !== undefined) {
                                                            return group.itemClinicalThreats[itemDisplayName];
                                                          }
                                                          if (matchingScoutIdx !== -1 && group.itemClinicalThreats[String(matchingScoutIdx)] !== undefined) {
                                                            return group.itemClinicalThreats[String(matchingScoutIdx)];
                                                          }
                                                          if (group.itemClinicalThreats[String(itemIdx)] !== undefined) {
                                                            return group.itemClinicalThreats[String(itemIdx)];
                                                          }
                                                          return undefined;
                                                        })();

                                                        const threatBadge = (() => {
                                                          if (!itemClinicalThreat) return null;
                                                          const t = String(itemClinicalThreat).toLowerCase();
                                                          let bg = "bg-rose-50 dark:bg-rose-950/25 border border-rose-200/30";
                                                          let text = "text-rose-700 dark:text-rose-400";
                                                          let icon = "⚠️";
                                                          if (t.includes('safe') || t.includes('no threat') || t.includes('healthy') || t.includes('none')) {
                                                            bg = "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30";
                                                            text = "text-emerald-700 dark:text-emerald-400";
                                                            icon = "✓";
                                                          } else if (t.includes('caution') || t.includes('moderate') || t.includes('medium')) {
                                                            bg = "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30";
                                                            text = "text-amber-700 dark:text-amber-400";
                                                            icon = "⚠️";
                                                          }
                                                          return { bg, text, icon };
                                                        })();

                                                        const chipContent = !shouldShowAsPreview ? (
                                                          <div 
                                                            className={`flex flex-col justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-left min-h-[48px] px-3 w-full ${
                                                              isSelected 
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md font-bold scale-[1.02]' 
                                                                : isSelectingMode 
                                                                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.01]' 
                                                                  : 'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:shadow'
                                                            }`}
                                                            onClick={() => chipOnClick()}
                                                          >
                                                            <div className="flex flex-col gap-1 w-full">
                                                              <span className={`text-[10.5px] lowercase font-semibold leading-tight break-words text-left ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {itemDisplayName}
                                                                {(item.confidenceRating === 'Low' || item.confidenceRating === 'Medium') && (
                                                                  <span className="block text-[9px] font-medium text-amber-600 dark:text-amber-400 mt-1 italic">
                                                                    Low confidence: Please provide new picture or description.
                                                                  </span>
                                                                )}
                                                              </span>
                                                              {itemClinicalThreat && threatBadge && (
                                                                <div className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold inline-block w-fit max-w-full truncate ${threatBadge.bg} ${threatBadge.text}`} title={itemClinicalThreat}>
                                                                  {threatBadge.icon} {itemClinicalThreat}
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <FoodScoutItemPreview
                                                            name={itemDisplayName}
                                                            src={finalSrc}
                                                            boundingBox={bb}
                                                            imgIdx={imgIdx}
                                                            messageImages={resolvedMessageImages}
                                                            isActive={isSelected}
                                                            isSearchMode={isSelectingMode}
                                                            searchMode="complete"
                                                            onClick={() => chipOnClick(onlineImageUrls[itemKeyForCache])}
                                                            prefetchedSrc={onlineImageUrls[itemKeyForCache]}
                                                            clinicalThreat={itemClinicalThreat}
                                                          />
                                                        );

                                                        const isActiveItem = searchModes[fullItemKey];
                                                        const itemResults = searchResults[fullItemKey] || [];
                                                        const itemLoading = !!searchLoading[fullItemKey];

                                                        return (
                                                          <React.Fragment key={itemIdx}>
                                                            <div className={`relative flex flex-col gap-2 w-full ${hasBeenSearched && isGridExpanded ? 'col-span-2' : 'col-span-1'}`}>
                                                                {chipContent}
                                                                {!!searchResults[fullItemKey] && (
                                                                    <button 
                                                                      onClick={(e) => { e.stopPropagation(); setPreviewState({ groupIdx: idx, itemIdx: itemIdx, resolvedImgSrc }); }}
                                                                      className="absolute -top-1.5 -right-1.5 p-1 bg-slate-900/80 text-white rounded-full transition-colors z-10 shadow-sm"
                                                                      title="View original photo"
                                                                    >
                                                                      <Eye className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            {isActiveItem && (
                                                              <div className="col-span-full w-full basis-full mt-3 mb-5 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 bg-white/50 dark:bg-slate-900/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 font-sans">
                                                                {itemLoading ? (
                                                                  <div className="text-[10px] text-indigo-500 animate-pulse text-center py-2">Searching images...</div>
                                                                ) : itemResults.length > 0 ? (
                                                                  <div className="flex flex-col">
                                                                    <div className="flex justify-between items-center mb-2 px-1">
                                                                      <div className="text-[10px] font-medium text-slate-500">Image Results</div>
                                                                      <button 
                                                                        onClick={(e) => { e.stopPropagation(); setSearchResults(prev => ({...prev, [fullItemKey]: []})); setSearchModes(prev => ({...prev, [fullItemKey]: false})); }}
                                                                        className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                                      >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                      </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                      {itemResults.map((res: any, sIdx: number) => {
                                                                        if (brokenSearchImages[`${fullItemKey}-${sIdx}`]) return null;
                                                                        return (
                                                                          <div 
                                                                            key={sIdx} 
                                                                            className="w-full rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 hover:ring-1 hover:ring-indigo-400 transition-all bg-black/5 flex flex-col"
                                                                            onClick={() => setSearchPreview({ groupKey: fullItemKey, index: sIdx })}
                                                                          >
                                                                            <div className="h-24 sm:h-32 w-full flex-shrink-0">
                                                                              <img 
                                                                                src={res.imageUrl} 
                                                                                alt={res.title} 
                                                                                className="w-full h-full object-cover" 
                                                                                onError={() => setBrokenSearchImages(prev => ({ ...prev, [`${fullItemKey}-${sIdx}`]: true }))}
                                                                              />
                                                                            </div>
                                                                            <div className="p-1 bg-slate-50 dark:bg-slate-900 text-[9px] truncate text-slate-500 text-center flex-grow flex items-center justify-center">{res.title}</div>
                                                                          </div>
                                                                        );
                                                                      })}
                                                                    </div>
                                                                  </div>
                                                                ) : (
                                                                  <div className="flex flex-col items-center justify-center py-4 gap-2 text-center text-slate-500 dark:text-slate-400">
                                                                    <Search className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">No images found</span>
                                                                    <span className="text-[9.5px] text-slate-400 max-w-[200px]">
                                                                      No web images could be retrieved for "{itemDisplayName}".
                                                                    </span>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            )}
                                                          </React.Fragment>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                ));
                                              })()}
                                            </div>

                                            <div className="pb-8" />
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

      {/* Single-zoom modal overlays with navigation chevrons and floating titles */}
      {(() => {
        if (!previewState) return null;
        const group = displayGroups[previewState.groupIdx];
        if (!group) return null;
        const item = group.items?.[previewState.itemIdx];
        if (!item) return null;
        // Look back in messages history to find original uploads containing images
        const historicalMsgWithImages = (() => {
          const currentImgs = msg.data?.pendingFoodLog?.imageUrls || msg.data?.imageUrls || [];
          if (currentImgs.length > 0) return msg;
          if (messages) {
            for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
              const m = messages[mIdx];
              const mImages = m.data?.pendingFoodLog?.imageUrls || m.data?.imageUrls || [];
              if (mImages.length > 0) return m;
            }
          }
          return null;
        })();
        const resolvedMessageImages = messageImages.length > 0 
          ? messageImages 
          : (historicalMsgWithImages?.data?.pendingFoodLog?.imageUrls || historicalMsgWithImages?.data?.imageUrls || []);
        const resolvedScoutItems = msg.data?.scoutItems && msg.data.scoutItems.length > 0
          ? msg.data.scoutItems
          : (historicalMsgWithImages?.data?.scoutItems || []);
        // Resolve its image source and bounding box:
        const matchingScout = (resolvedScoutItems || []).find((s: any) => 
          (item.name || "").toLowerCase().includes((s.keyword || "").toLowerCase()) || 
          (s.keyword || "").toLowerCase().includes((item.name || "").toLowerCase()) ||
          (item.name || "").toLowerCase().split(' ')[0] === (s.keyword || "").toLowerCase().split(' ')[0]
        );
        const imgIdx = typeof item.sourceImageIndex === 'number' 
          ? item.sourceImageIndex 
          : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
        const itemKeyForCache = `${msg.id}-${previewState.groupIdx}-${previewState.itemIdx}`;
        let resolvedImgSrc = onlineImageUrls[itemKeyForCache] || ((resolvedMessageImages.length > 0)
          ? resolvedMessageImages[imgIdx >= 0 && imgIdx < resolvedMessageImages.length ? imgIdx : 0]
          : getFoodImageUrl(item.name, ''));
        
        if (previewState.resolvedImgSrc && previewState.itemIdx === 0) {
          resolvedImgSrc = previewState.resolvedImgSrc;
        }
        if (previewState.overrideSrc) {
          resolvedImgSrc = previewState.overrideSrc;
        }
        const hasLookedUpImage = !!(onlineImageUrls[itemKeyForCache] || previewState.overrideSrc);
        const bb = hasLookedUpImage ? null : (item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null));
        const groupKey = `${msg.id}-${previewState.groupIdx}`;
        const itemDisplayName = showTranslations[groupKey] ? (item.keyword || item.name) : (item.originalName || item.name);
        return (
          <ZoomableImage 
            src={resolvedImgSrc} 
            boundingBox={bb}
            onClose={() => setPreviewState(null)}
            foodName={itemDisplayName}
            hasNext={previewState.itemIdx < group.items.length - 1}
            hasPrev={previewState.itemIdx > 0}
            onNext={() => setPreviewState(prev => prev ? { ...prev, itemIdx: prev.itemIdx + 1, resolvedImgSrc: undefined, overrideSrc: undefined } : null)}
            onPrev={() => setPreviewState(prev => prev ? { ...prev, itemIdx: prev.itemIdx - 1, resolvedImgSrc: undefined, overrideSrc: undefined } : null)}
          />
        );
      })()}
      {(() => {
        if (scoutPreviewIdx === null) return null;
        
        const item = activeScoutItems[scoutPreviewIdx];
        if (!item) return null;
        const imgIdx = typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : 0;
        const resolvedImgSrc = (messageImages.length > 0)
          ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
          : getFoodImageUrl(item.keyword);
        const bb = item.boundingBox2D || null;
        return (
          <ZoomableImage 
            src={resolvedImgSrc} 
            boundingBox={bb}
            onClose={() => setScoutPreviewIdx(null)}
            foodName={item.originalName || item.keyword}
            hasNext={scoutPreviewIdx < activeScoutItems.length - 1}
            hasPrev={scoutPreviewIdx > 0}
            onNext={() => setScoutPreviewIdx(prev => prev !== null ? prev + 1 : null)}
            onPrev={() => setScoutPreviewIdx(prev => prev !== null ? prev - 1 : null)}
          />
        );
      })()}
      {externalPreviewImg && (
        <ZoomableImage 
          src={externalPreviewImg.url} 
          boundingBox={undefined}
          onClose={() => setExternalPreviewImg(null)}
          foodName={externalPreviewImg.title}
        />
      )}
      {searchPreview && (() => {
        const results = searchResults[searchPreview.groupKey] || [];
        const validResults = results.map((res, i) => ({ ...res, index: i })).filter((_, i) => !brokenSearchImages[`${searchPreview.groupKey}-${i}`]);
        if (validResults.length === 0) return null;
        const currentValidIdx = validResults.findIndex(r => r.index === searchPreview.index);
        if (currentValidIdx === -1) return null;
        
        return (
          <ZoomableImage
            src={validResults[currentValidIdx].imageUrl}
            onClose={() => setSearchPreview(null)}
            foodName={validResults[currentValidIdx].title}
            sourceUrl={validResults[currentValidIdx].pageUrl}
            hasNext={currentValidIdx < validResults.length - 1}
            hasPrev={currentValidIdx > 0}
            onNext={() => setSearchPreview({ groupKey: searchPreview.groupKey, index: validResults[currentValidIdx + 1].index })}
            onPrev={() => setSearchPreview({ groupKey: searchPreview.groupKey, index: validResults[currentValidIdx - 1].index })}
          />
        );
      })()}

      {/* Case F: Food Origin & Details experiential encyclopedia card renderer */}


                  {msg.data?.pendingFoodLog && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 animation-fade-in w-full max-w-full min-w-0 overflow-hidden font-sans">
                      {msg.data.correctionOf && (
                         <div className="flex justify-center pb-2">
                           <button 
                             onClick={() => {
                               window.scrollTo({ top: 0, behavior: 'smooth' });
                             }}
                             className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                           >
                             <ChevronUp className="w-3 h-3" />
                             Scroll to top
                           </button>
                         </div>
                      )}
                      {msg.data?.pendingFoodLog.imageUrls && msg.data?.pendingFoodLog.imageUrls.length > 0 && (
                        <div className="overflow-hidden border-y sm:border border-slate-100 dark:border-slate-700/50 shadow-sm mb-3 w-[calc(100%+2rem)] -mx-4 sm:mx-0 sm:w-full sm:rounded-2xl">
                          <ImageSlider images={msg.data?.pendingFoodLog.imageUrls} altText={msg.data?.pendingFoodLog.name || "Pending meal"} />
                        </div>
                      )}
                      


                      {(() => {
                        const scoutType = (msg.data?.scoutContentType || '').toLowerCase();
                        const isMenuOrPoster = scoutType === 'text' || scoutType === 'menu_or_poster';
                        const isVisualOrPosted = scoutType === 'visual_or_posted';
                        const displayAsMenu = isMenuOrPoster && !isVisualOrPosted;

                        if (displayedScoutItems.length === 0) return null;
                        return (
                          <div className="mb-6 text-left">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/50 pb-2 font-sans">
                              <div className="flex items-center gap-2">
                                <span className="text-[10.5px] font-bold text-indigo-500 dark:text-indigo-400">
                                  🔍 Meal composition
                                </span>
                                {displayedScoutItems.some((i: any) => i.originalName && i.originalName.toLowerCase() !== (i.keyword || "").toLowerCase()) && (
                                 <button
                                   type="button"
                                   onClick={() => setShowTranslations(prev => ({ ...prev, scout: !prev.scout }))}
                                   className={`p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md transition-all cursor-pointer ${
                                     showTranslations.scout ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                   }`}
                                   title="Toggle Language"
                                 >
                                   <span className="text-[9px] font-bold leading-none block px-0.5 py-[1px]">{showTranslations.scout ? "English" : "Local"}</span>
                                 </button>
                                )}
                              </div>
                              {msg.data?.pendingFoodLog?.scoutConfidenceRating && !msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase().includes('high') && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  msg.data.pendingFoodLog.scoutConfidenceRating.toLowerCase().includes('low') 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400'
                                }`}>
                                  Confidence: {msg.data.pendingFoodLog.scoutConfidenceRating}
                                </span>
                              )}
                            </div>
                             <div className={displayAsMenu ? "flex flex-wrap gap-2 pt-1 font-sans" : "flex gap-3 overflow-x-auto pt-2 pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full font-sans"}>
                               {displayedScoutItems.map((item: any, i: number) => {
                                 if (displayAsMenu) {
                                   return (
                                     <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                       <span className="text-[10px] font-bold">
                                         {showTranslations.scout ? (item.keyword || item.originalName) : (item.originalName || item.keyword)}
                                       </span>
                                     </div>
                                   );
                                 }
                                 const imgIdx = typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : 0;
                                 const resolvedImgSrc = (messageImages.length > 0)
                                   ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                   : getFoodImageUrl(item.keyword);
                                 return (
                                   <div key={i} className="flex flex-col items-center gap-1 shrink-0 snap-align-start w-[72px] relative group">
                                     <div className="relative">
                                       <div 
                                         className={`w-[72px] h-[72px] rounded-xl overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${
                                           (item.itemConfidence?.toLowerCase().includes('low') || item.itemConfidence?.toLowerCase().includes('medium')) 
                                             ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 shadow-amber-500/20'
                                             : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50'
                                         }`}
                                         onClick={() => setScoutPreviewIdx(i)}
                                       >
                                         {item.boundingBox2D ? (
                                           <CroppedFoodImage 
                                             src={resolvedImgSrc} 
                                             boundingBox={item.boundingBox2D} 
                                             alt={item.keyword} 
                                             className="w-full h-full object-cover"
                                             imageUrls={messageImages}
                                             sourceImageIndex={imgIdx}
                                           />
                                         ) : (
                                           <img 
                                             src={resolvedImgSrc} 
                                             alt={item.keyword} 
                                             className="w-full h-full object-cover"
                                             onError={(e) => {
                                               (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80&auto=format';
                                             }}
                                           />
                                         )}
                                       </div>
                                       {/* Warning Icon for Low/Medium Confidence - Moved OUTSIDE the overflow-hidden div */}
                                       {(item.itemConfidence?.toLowerCase().includes('low') || item.itemConfidence?.toLowerCase().includes('medium')) && (
                                         <div 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setReviewsOpen(true);
                                           }}
                                           className="absolute -top-1.5 -right-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10 cursor-pointer hover:scale-110 transition-transform"
                                           title="Show low confidence identification panel"
                                         >
                                           <span className="text-[10px] font-bold">!</span>
                                         </div>
                                       )}
                                     </div>
                                     <span className="text-[9px] text-center font-medium leading-tight text-slate-500 truncate w-full font-sans">
                                       {showTranslations.scout ? (item.keyword || item.originalName) : (item.originalName || item.keyword)}
                                     </span>
                                     {/* Confidence badge below the name — full detail now lives in Items in Review */}
                                     {(item.itemConfidence?.toLowerCase().includes('low') || item.itemConfidence?.toLowerCase().includes('medium')) && (
                                       <span className="text-[8px] text-center leading-tight text-amber-600 dark:text-amber-500 w-full font-sans">
                                         Confidence: {(item.itemConfidence || '').split('(')[0].trim()}
                                       </span>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                             
                             {/* Uncertain Items Helper Button */}
                             {reviewsOpen && displayedScoutItems.some((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0)) && (
                               <div className="mt-2 flex flex-col gap-1.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-lg p-2 font-sans relative">
                                 <button 
                                   onClick={() => setReviewsOpen(false)}
                                   className="absolute top-1.5 right-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-0.5 rounded-full hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                                   title="Close panel"
                                 >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                                 <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 pr-6">
                                   <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                   <div className="flex flex-col gap-0.5">
                                     <span className="text-[11px] font-bold leading-tight">Low confidence identification</span>
                                     {displayedScoutItems
                                        .filter((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0))
                                        .map((i: any, reviewIdx: number) => (
                                          <span key={reviewIdx} className="text-[10px] font-medium leading-tight">
                                            {(i.originalName || i.keyword || i.name)}{i.anomalyFlags && i.anomalyFlags.length > 0 ? ` - ${i.anomalyFlags.join(', ')}` : ''}
                                          </span>
                                        ))}
                                   </div>
                                 </div>
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                       const flaggedItem = displayedScoutItems.find((i: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0));
                                       const targetName = flaggedItem?.originalName || flaggedItem?.keyword || flaggedItem?.name || 'this item';
                                       if (setInputText) setInputText(`Correct ${targetName} to `);
                                       setTimeout(() => document.getElementById('food-chat-input')?.focus(), 50);
                                     }} 
                                     className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                   >
                                     Edit Item
                                   </button>
                                   <button 
                                     onClick={() => { 
                                       const flaggedIndices = displayedScoutItems
                                         .map((i: any, idx: number) => ({ i, idx }))
                                         .filter(({ i }: any) => i.itemConfidence?.toLowerCase().includes('low') || i.itemConfidence?.toLowerCase().includes('medium') || (i.anomalyFlags && i.anomalyFlags.length > 0))
                                         .map(({ i, idx }: any) => i.scoutIndex ?? idx);
                                       setConfirmedScoutIndices(prev => new Set([...prev, ...flaggedIndices]));
                                     }} 
                                     className="flex-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/40 active:scale-95 transition-all text-center"
                                   >
                                     This is correct
                                   </button>
                                 </div>
                               </div>
                             )}
                             <NutritionLabelTable defaultOpen={false} activeScoutItems={displayedScoutItems} onConfirmItem={(idx) => setConfirmedScoutIndices(prev => new Set(prev).add(idx))} />
                          </div>
                        );
                      })()}

                      <div className="flex flex-col items-start border-b border-slate-100 dark:border-slate-800/50 pb-3 gap-2 text-left">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-display leading-tight">
                          {msg.data?.pendingFoodLog.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold font-sans">
                            {msg.data?.pendingFoodLog.weightGrams}g ({msg.data?.pendingFoodLog.quantity})
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{msg.data?.pendingFoodLog.date}</span>
                        </div>
                      </div>

                      {(msg.content || msg.data?.agentResult?.message) && (
                        <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-left py-2 border-b border-slate-100 dark:border-slate-800/50 whitespace-pre-line break-words">
                          {typeof (msg.content || msg.data?.agentResult?.message) === 'object' 
                            ? JSON.stringify(msg.content || msg.data?.agentResult?.message) 
                            : (msg.content || msg.data?.agentResult?.message)}
                        </div>
                      )}

                      <div className="text-[11.5px] space-y-2 text-slate-800 dark:text-slate-100 font-medium text-left font-sans leading-relaxed">
                        <p><strong className="text-slate-900 dark:text-white">{t.composition}:</strong> {msg.data?.pendingFoodLog.composition}</p>
                        {msg.data?.pendingFoodLog.cookingMethod && (
                          <p className="text-slate-700 dark:text-slate-400 italic">{msg.data?.pendingFoodLog.cookingMethod}</p>
                        )}
                        <p><strong className="text-slate-900 dark:text-white">{t.benefits}:</strong> {msg.data?.pendingFoodLog.benefits}</p>
                        {msg.data?.pendingFoodLog.risks && <p><strong className="text-slate-900 dark:text-white">{t.risks}:</strong> {msg.data?.pendingFoodLog.risks}</p>}
                        <p><strong className="text-slate-900 dark:text-white">{t.impact}:</strong> {msg.data?.pendingFoodLog.healthImpact}</p>
                      </div>

                      {/* Dynamic Top Nutrients badges driven by User Profile configuration */}
                      {(() => {
                        const parseTarget = (val: any, fallback: number) => {
                          if (val === null || val === undefined) return fallback;
                          const cleanStr = String(val).replace(/,/g, '');
                          const matches = cleanStr.match(/\d+(\.\d+)?/g);
                          if (!matches || matches.length === 0) return fallback;
                          const parsed = parseFloat(matches[0]);
                          return isNaN(parsed) ? fallback : parsed;
                        };
                        const logDate = msg.data?.pendingFoodLog.date;
                        const dayLogs = foodLogs ? foodLogs.filter(f => f.date === logDate) : [];
                        // Default allowances
                        const defaultTargets: { [key: string]: number } = {
                          calories: 2000,
                          saturatedFat: 15,
                          sodium: 1200,
                          addedSugar: 30,
                          totalFat: 65,
                          protein: 50,
                          carbohydrates: 250,
                          totalFibre: 30
                        };
                        const nutrientColors: { [key: string]: string } = {
                          calories: 'rgb(249, 115, 22)',     // Orange
                          saturatedFat: 'rgb(234, 179, 8)',  // Yellow
                          sodium: 'rgb(34, 197, 94)',        // Green
                          addedSugar: 'rgb(239, 68, 68)',    // Red
                          totalFat: 'rgb(168, 85, 247)',     // Purple
                          protein: 'rgb(59, 130, 246)',      // Blue
                          carbohydrates: 'rgb(6, 182, 212)', // Cyan
                          totalFibre: 'rgb(16, 185, 129)'    // Emerald
                        };
                        const nutrientLabels: { [key: string]: string } = {
                          calories: 'Calories',
                          saturatedFat: 'Sat Fat',
                          sodium: 'Sodium',
                          addedSugar: 'Added Sugar',
                          totalFat: 'Total Fat',
                          protein: 'Protein',
                          carbohydrates: 'Carbs',
                          totalFibre: 'Fibre'
                        };
                        const nutrientUnits: { [key: string]: string } = {
                          calories: 'kcal',
                          sodium: 'mg',
                          potassium: 'mg'
                        };
                        // Read top nutrients from profile, fall back to default calories, satFat, sodium
                        const activeKeys = profile?.topNutrientsToMonitor || ['calories', 'saturatedFat', 'sodium'];
                        const formatNutrientValue = (v: number, u: string) => {
                          if (v === null || v === undefined || isNaN(v)) return `— ${u}`;
                          const abs = Math.abs(v);
                          if (abs >= 1000) return `${(v / 1000).toFixed(2)}k ${u}`;
                          if (abs >= 100) return `${Math.round(v)} ${u}`;
                          if (abs >= 10) return `${v.toFixed(1)} ${u}`;
                          return `${v.toFixed(2)} ${u}`;
                        };
                        return (
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {activeKeys.map((key) => {
                              const valueInMeal = msg.data?.pendingFoodLog.nutrients?.[key];
                              if (valueInMeal === undefined || valueInMeal === null) return null;
                              const reportTarget = report?.dailyNutrientTargets?.[key];
                              const fallbackVal = defaultTargets[key] || 15;
                              const target = parseTarget(reportTarget, fallbackVal);
                              const consumedToday = dayLogs.reduce((acc, curr) => acc + (curr.nutrients?.[key] || 0), 0);
                              
                              const color = nutrientColors[key] || 'rgb(100, 116, 139)'; // Slate fallback
                              const label = nutrientLabels[key] || (key.replace(/([A-Z])/g, ' $1').trim());
                              const unit = nutrientUnits[key] || 'g';
                              return (
                                <div key={key} className="flex items-center gap-1.5">
                                  <NutrientPieChart
                                    allowance={target}
                                    alreadyConsumed={consumedToday}
                                    mealValue={valueInMeal}
                                    nutrientKey={key as any}
                                    size="sm"
                                  />
                                  <span className={key === 'calories' ? "text-[11px] font-extrabold" : "text-[11px] font-bold"} style={{ color }}>
                                    {key === 'calories' ? '' : `${label}: `}{formatNutrientValue(valueInMeal, unit)}
                                  </span>
                                </div>
                              );
                            })}
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
                                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                                      📊 Component Contribution
                                    </span>
                                    {displayedScoutItems.some((i: any) => i.originalName && i.originalName.toLowerCase() !== (i.keyword || "").toLowerCase()) && (
                                      <button
                                        type="button"
                                        onClick={() => setShowTranslations(prev => ({ ...prev, scout: !prev.scout }))}
                                        className={`p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md transition-all cursor-pointer ${
                                          showTranslations.scout ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                        }`}
                                        title="Toggle Language"
                                      >
                                        <span className="text-[9px] font-bold leading-none block px-1 py-0.5">{showTranslations.scout ? "English" : "Local"}</span>
                                      </button>
                                    )}
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
                                        {msg.data?.pendingFoodLog.itemsBreakdown.map((item: any, itemIdx: number) => {
                                          const cleanItemName = (item.name || '').toLowerCase().trim();
                                          const matchingScout = displayedScoutItems.find((s: any) => {
                                            const cleanKeyword = (s.keyword || '').toLowerCase().trim();
                                            const cleanOrig = (s.originalName || '').toLowerCase().trim();
                                            const cleanName = (s.name || '').toLowerCase().trim();
                                            return (
                                              cleanItemName === cleanKeyword ||
                                              cleanItemName === cleanOrig ||
                                              cleanItemName === cleanName ||
                                              cleanItemName.includes(cleanKeyword) ||
                                              cleanKeyword.includes(cleanItemName) ||
                                              (cleanOrig && (cleanItemName.includes(cleanOrig) || cleanOrig.includes(cleanItemName)))
                                            );
                                          });

                                          const displayName = matchingScout 
                                            ? (showTranslations.scout 
                                                ? (matchingScout.keyword || matchingScout.originalName || item.name)
                                                : (matchingScout.originalName || matchingScout.keyword || item.name))
                                            : item.name;

                                          return (
                                            <tr 
                                              key={itemIdx} 
                                              className="border-b last:border-b-0 border-slate-100 dark:border-slate-850 text-slate-750 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-850/20"
                                            >
                                              <td className="p-2 font-semibold text-xs leading-normal whitespace-normal break-words max-w-[180px]" title={displayName}>
                                                {displayName}
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
                                          );
                                        })}
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
                              const foodToLog = {
                                ...msg.data.pendingFoodLog,
                                scoutItems: msg.data.scoutItems || [],
                                imageUrl: msg.data.pendingFoodLog?.imageUrl || (messageImages.length > 0 ? messageImages[0] : undefined),
                                imageUrls: (msg.data.pendingFoodLog?.imageUrls && msg.data.pendingFoodLog.imageUrls.length > 0)
                                  ? msg.data.pendingFoodLog.imageUrls
                                  : (messageImages.length > 0 ? messageImages : undefined)
                              };
                              onLogFood(foodToLog as FoodLog);
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
