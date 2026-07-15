import * as React from 'react';
import { AgentCardProps } from './types';
import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2 } from 'lucide-react';
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

const OriginImageTile = ({ queryStr, fallbackSrc, onResolved, onClick, onError }: any) => {
  const [src, setSrc] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await fetch("/api/gemini/food-image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryStr }),
        });
        const data = await res.json();
        if (active && data.images && data.images.length > 0) {
          const img = data.images[0];
          setSrc(img.imageUrl);
          if (onResolved) onResolved(img.imageUrl, img.pageUrl);
        }
      } catch (err) {
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [queryStr]);

  return (
    <img
      src={src || fallbackSrc}
      alt={queryStr}
      className={`w-full h-full object-cover animate-fade-in ${loading ? 'animate-pulse bg-slate-100 dark:bg-slate-800' : ''}`}
      referrerPolicy="no-referrer"
      onClick={onClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
        if (onError) onError();
      }}
    />
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
    onLogFood, setLoggedMessageIds, loggedMessageIds, profile, handleSend
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
  const [originPreview, setOriginPreview] = React.useState<{ itemIdx: number, imgIdx: number } | null>(null);
  const originImagesRef = React.useRef<Record<string, { imageUrl: string, pageUrl: string }>>({});
  const [brokenOriginImages, setBrokenOriginImages] = React.useState<Record<string, true>>({});
  const [groupExpanded, setGroupExpanded] = React.useState<Record<string, boolean>>({});

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
  
  const [showTranslated, setShowTranslated] = React.useState<boolean>(true);
  const [previewState, setPreviewState] = React.useState<{ groupIdx: number, itemIdx: number } | null>(null);
  const [scoutPreviewIdx, setScoutPreviewIdx] = React.useState<number | null>(null);
  const [externalPreviewImg, setExternalPreviewImg] = React.useState<{ url: string; title: string } | null>(null);

  const handleFoodSearch = async (groupIdx: number, itemIdx: number, query: string) => {
    const groupKey = `${msg.id}-${groupIdx}`;
    setSearchedItemIndices(prev => ({ ...prev, [groupKey]: itemIdx }));
    setSearchModes(prev => ({ ...prev, [groupKey]: true }));
    
    if (searchResults[groupKey] && searchResults[groupKey].length > 0) {
      return;
    }

    setSearchLoading(prev => ({ ...prev, [groupKey]: true }));
    setSearchErrors(prev => ({ ...prev, [groupKey]: "" }));
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
        setSearchResults(prev => ({ ...prev, [groupKey]: [] }));
        setSearchErrors(prev => ({ ...prev, [groupKey]: data.error || "No images returned." }));
      }
    } catch (e: any) {
      console.error("Search error:", e);
      setSearchResults(prev => ({ ...prev, [groupKey]: [] }));
      setSearchErrors(prev => ({ ...prev, [groupKey]: e.message || "Failed to load Google Search API." }));
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
      if (s.includes('best') || s.includes('safest') || s.includes('recommended') || s.includes('perfect')) return 3;
      if (s.includes('good') || s.includes('safe') || s.includes('low risk') || s.includes('limit')) return 2;
      if (s.includes('moderate') || s.includes('medium') || s.includes('caution') || s.includes('amber')) return 1;
      return 0;
    };
    
    // Sort evaluation groups: most recommended/safest first
    rawGroups.sort((a, b) => getSuitabilityScore(b.suitability || '') - getSuitabilityScore(a.suitability || ''));
    
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
          sourceImageIndex: typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0)
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

    // Find missing scout items
    const scoutItems = msg.data?.scoutItems || [];
    if (scoutItems.length > 0) {
      const evaluatedNames = new Set<string>();
      groups.forEach((g: any) => {
        (g.items || []).forEach((item: any) => {
          evaluatedNames.add(item.name.toLowerCase());
        });
      });
      
      const missingItems = scoutItems.filter((s: any) => {
         const kw = s.keyword.toLowerCase();
         for (const name of evaluatedNames) {
           if (name.includes(kw) || kw.includes(name) || name.split(' ')[0] === kw.split(' ')[0]) {
             return false;
           }
         }
         return true;
      });
      
      if (missingItems.length > 0) {
        groups.push({
          groupName: "Other Identified Items",
          suitability: "Uncategorized",
          pros: "",
          cons: "These items were detected but skipped in the detailed comparison due to AI output limits.",
          items: missingItems.map((s: any) => ({
            name: s.originalName || s.keyword,
            keyword: s.keyword,
            originalName: s.originalName,
            boundingBox2D: s.boundingBox2D,
            sourceImageIndex: s.sourceImageIndex
          }))
        });
      }
    }
    return groups;
  }, [msg.data, profile?.topNutrientsToMonitor]);

  // Register parent Action handlers
  React.useEffect(() => {
    if (props.actionRef && props.isSelectingMode) {
      props.actionRef.current = {
        triggerImageSearch: (keys: string[]) => {
          if (keys.length !== 1) {
            setSelectorError("Image Search only supports searching one item at a time. Please select exactly 1 item.");
            return;
          }
          setSelectorError("");
          const [gIdx, iIdx] = keys[0].split('-').map(Number);
          const name = displayGroups[gIdx]?.items?.[iIdx]?.name;
          handleFoodSearch(gIdx, iIdx, name);
        },
        triggerOriginSearch: (keys: string[]) => {
          setSelectorError("");
          const selectedNames = keys.map(key => {
            const [gIdx, iIdx] = key.split('-').map(Number);
            return displayGroups[gIdx]?.items?.[iIdx]?.name;
          });
          if (handleSend) {
            handleSend(`Origin search: Provide the historical origin, cooking methods, typical eating occasions, top nutrient impact, and recommendations for: ${selectedNames.join(', ')}. Please include 1-3 Google image search queries for each.`);
          }
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

                                {/* Re-use exactly same preview picture with zoom action */}
                                {(() => {
                                  const itemObj = group.items?.[0];
                                  const matchingScout = (resolvedScoutItems || []).find((s: any) => {
                                    const gName = (group.groupName || "").toLowerCase();
                                    const sKw = (s.keyword || "").toLowerCase();
                                    const sOrig = (s.originalName || "").toLowerCase();
                                    return (
                                      (gName && sKw && (gName.includes(sKw) || sKw.includes(gName))) ||
                                      (gName && sOrig && (gName.includes(sOrig) || sOrig.includes(gName))) ||
                                      (gName.split(' ')[0] === sKw.split(' ')[0])
                                    );
                                  });
                                  const bb = itemObj?.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);
                                  const imgIdx = itemObj ? (typeof itemObj.sourceImageIndex === 'number' ? itemObj.sourceImageIndex : 0) : (matchingScout && typeof matchingScout.sourceImageIndex === 'number' ? matchingScout.sourceImageIndex : 0);
                                  const heroHeight = bb ? Math.abs(bb[2] - bb[0]) : 0;
                                  const heroWidth = bb ? Math.abs(bb[3] - bb[1]) : 0;
                                  const heroAspect = heroHeight > 0 ? heroWidth / heroHeight : 0;
                                  const isMenuOrPoster = msg.data?.scoutContentType === 'menu_or_poster';
                                  const heroIsTextOnly = isMenuOrPoster || !bb || bb.length < 4 || heroAspect > 2.2 || heroHeight < 20;
                                  const resolvedImgSrc = (resolvedMessageImages.length > 0)
                                    ? resolvedMessageImages[imgIdx >= 0 && imgIdx < resolvedMessageImages.length ? imgIdx : 0]
                                    : getFoodImageUrl(group.groupName, '');

                                  return (
                                    <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 relative shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
                                      <FoodScoutItemPreview
                                        name={group.groupName}
                                        src={resolvedImgSrc}
                                        boundingBox={heroIsTextOnly ? null : bb}
                                        imgIdx={imgIdx}
                                        messageImages={resolvedMessageImages}
                                        isActive={false}
                                        isSearchMode={false}
                                        onClick={() => {
                                          setPreviewState({ groupIdx: idx, itemIdx: 0 });
                                        }}
                                      />
                                    </div>
                                  );
                                })()}
                                
                                {/* Aggregated Nutrients - Filters and shows only profile top nutrients */}
                                <div className="space-y-1">
                                  {(() => {
                                    // Filter comparison nutrients to match the profile top nutrients configuration
                                    const keysToRender = profile?.topNutrientsToMonitor || ["calories", "saturatedFat", "sodium"];
                                    
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
                                     const isMenuOrPoster = msg.data?.scoutContentType === 'menu_or_poster';
                                     
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
                                       const bb = item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);
                                       return { src: resolvedImgSrc, boundingBox: bb, foodName: item.name, imgIdx };
                                     });
                                     // 2. Compute indices of text-only items (force for menu contentType or aspect ratio > 2.2 or height < 20)
                                     const textOnlyIndices = (group.items || []).map((item: any, itemIdx: number) => {
                                       const bb = groupPreviewItems[itemIdx]?.boundingBox;
                                       const height = bb ? Math.abs(bb[2] - bb[0]) : 0;
                                       const width = bb ? Math.abs(bb[3] - bb[1]) : 0;
                                       const aspect = height > 0 ? width / height : 0;
                                       const isTextOnly = isMenuOrPoster || !bb || bb.length < 4 || aspect > 2.2 || height < 20;
                                       return isTextOnly ? itemIdx : -1;
                                     }).filter(index => index !== -1);
                                     const hasTextOnlyItems = textOnlyIndices.length > 0;
                                     const hasDishesImages = !isMenuOrPoster && groupPreviewItems.some(i => i.boundingBox && i.boundingBox.length === 4);
                                     const groupKey = `${msg.id}-${idx}`;
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
                                           <span>Foods in this group ({group.items?.length || 0})</span>
                                           <div className="flex items-center gap-1.5">
                                             {hasTranslations && !isSelectingMode && (
                                               <button 
                                                 onClick={() => setShowTranslated(!showTranslated)}
                                                 className="lowercase px-2 py-0.5 text-[9px] font-bold border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-all flex items-center gap-0.5 cursor-pointer"
                                                 title="Toggle translation"
                                               >
                                                 {showTranslated ? 'local' : 'english'}
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
                                                 setSearchModes(prev => ({ ...prev, [groupKey]: false }));
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
                                           {/* Search results display if CSE search was triggered */}
                                           {isSearchActive && (
                                             <div className="w-full space-y-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-850 font-sans">
                                               {isLoadingForGroup ? (
                                                 <div className="text-[10px] text-indigo-500 animate-pulse text-center">Searching images...</div>
                                               ) : resultsForGroup.length > 0 ? (
                                                 <div className="space-y-2">
                                                   <div className="flex justify-end">
                                                     <button
                                                       onClick={() => {
                                                         setSearchResults(prev => ({ ...prev, [groupKey]: [] }));
                                                         setSearchModes(prev => ({ ...prev, [groupKey]: false }));
                                                       }}
                                                       className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                       title="Clear results"
                                                     >
                                                       <Trash2 className="w-3.5 h-3.5" />
                                                     </button>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2">
                                                     {resultsForGroup.map((res, sIdx) => {
                                                       if (brokenSearchImages[`${groupKey}-${sIdx}`]) return null;
                                                       return (
                                                         <div 
                                                           key={sIdx} 
                                                           className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                                                           onClick={() => setSearchPreview({ groupKey, index: sIdx })}
                                                         >
                                                           <img 
                                                             src={res.imageUrl} 
                                                             alt={res.title} 
                                                             className="w-full aspect-[4/3] object-cover" 
                                                             onError={() => setBrokenSearchImages(prev => ({ ...prev, [`${groupKey}-${sIdx}`]: true }))}
                                                           />
                                                           <div className="p-1 bg-slate-50 dark:bg-slate-900 text-[8px] truncate text-slate-500 text-center">{res.title}</div>
                                                         </div>
                                                       );
                                                     })}
                                                   </div>
                                                 </div>
                                               ) : (
                                                 <div className="text-[9.5px] text-rose-500 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/40 text-center leading-normal font-bold">
                                                   ⚠️ Search Error: {searchErrors[groupKey] || "Search API did not return valid items."}
                                                 </div>
                                               )}
                                             </div>
                                           )}
                                            <div className={hasDishesImages ? "grid grid-cols-3 sm:grid-cols-4 gap-3 w-full pb-8" : "flex flex-wrap gap-2 w-full pb-8"}>
                                             {(group.items || []).map((item: any, itemIdx: number) => {
                                               const { src: resolvedImgSrc, boundingBox: bb, imgIdx } = groupPreviewItems[itemIdx];
                                               const isTextOnly = textOnlyIndices.includes(itemIdx);
                                               const itemKey = `${idx}-${itemIdx}`;
                                               const isSelected = selectedItemKeys.includes(itemKey);
                                               const itemDisplayName = showTranslated ? (item.keyword || item.name) : (item.originalName || item.name);
                                               if (isTextOnly) {
                                                 return (
                                                   <div 
                                                     key={itemIdx} 
                                                     className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer shadow-sm transition-all duration-200 text-center min-h-[48px] ${
                                                       isSelected 
                                                         ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md font-bold scale-[1.02]' 
                                                         : isSelectingMode 
                                                           ? 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.01]' 
                                                           : 'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 hover:shadow'
                                                     }`}
                                                     onClick={() => {
                                                       if (isSelectingMode) {
                                                         setSelectedItemKeys(prev => 
                                                           prev.includes(itemKey) 
                                                             ? prev.filter(k => k !== itemKey) 
                                                             : [...prev, itemKey]
                                                         );
                                                       } else {
                                                         setPreviewState({ groupIdx: idx, itemIdx: itemIdx });
                                                       }
                                                     }}
                                                   >
                                                     <span className={`text-[10.5px] lowercase font-semibold leading-tight break-words text-center ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                       {itemDisplayName}
                                                     </span>
                                                   </div>
                                                 );
                                               }
                                               return (
                                                 <FoodScoutItemPreview
                                                   key={itemIdx}
                                                   name={itemDisplayName}
                                                   src={resolvedImgSrc}
                                                   boundingBox={bb}
                                                   imgIdx={imgIdx}
                                                   messageImages={resolvedMessageImages}
                                                   isActive={isSelected}
                                                   isSearchMode={isSelectingMode}
                                                   onClick={() => {
                                                     if (isSelectingMode) {
                                                       setSelectedItemKeys(prev => 
                                                         prev.includes(itemKey) 
                                                           ? prev.filter(k => k !== itemKey) 
                                                           : [...prev, itemKey]
                                                       );
                                                     } else {
                                                       setPreviewState({ groupIdx: idx, itemIdx: itemIdx });
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
                      {/* Card-Wide Selection Toolbar */}
                      {isSelectingMode && selectedItemKeys.length > 0 && props.isSelectingMode === undefined && (
                        <div className="mx-4 mb-4 p-3.5 rounded-2xl border border-indigo-150 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3 animate-fade-in font-sans text-left">
                          <div className="flex items-center justify-between border-b border-indigo-100/40 dark:border-indigo-950/30 pb-1.5">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Selected (${selectedItemKeys.length}) item(s) for actions:
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                setSelectedItemKeys([]);
                                setSelectorError("");
                              }}
                              className="text-[9.5px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                            >
                              Clear Selection
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {selectedItemKeys.map(key => {
                              const [gIdx, iIdx] = key.split('-').map(Number);
                              const name = displayGroups[gIdx]?.items?.[iIdx]?.name || "Item";
                              return (
                                <span key={key} className="px-2 py-0.5 lowercase bg-indigo-100/70 dark:bg-indigo-900/40 text-[9.5px] font-semibold rounded text-indigo-700 dark:text-indigo-300">
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                          {selectorError && (
                            <div className="text-[9.5px] font-bold text-rose-650 dark:text-rose-450 bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/40 leading-tight">
                              ⚠️ {selectorError}
                            </div>
                          )}
                          <div className="flex gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedItemKeys.length !== 1) {
                                  setSelectorError("Image Search only supports searching one item at a time. Please select exactly 1 item.");
                                  return;
                                }
                                setSelectorError("");
                                const [gIdx, iIdx] = selectedItemKeys[0].split('-').map(Number);
                                const name = displayGroups[gIdx]?.items?.[iIdx]?.name;
                                handleFoodSearch(gIdx, iIdx, name);
                                setIsSelectingMode(false);
                                setSelectedItemKeys([]);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer text-center"
                            >
                              Image Search
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectorError("");
                                const selectedNames = selectedItemKeys.map(key => {
                                  const [gIdx, iIdx] = key.split('-').map(Number);
                                  return displayGroups[gIdx]?.items?.[iIdx]?.name;
                                });
                                if (handleSend) {
                                  handleSend(`Origin search: Provide the historical origin, cooking methods, typical eating occasions, top nutrient impact, and recommendations for: ${selectedNames.join(', ')}. Please include 1-3 Google image search queries for each.`);
                                }
                                setIsSelectingMode(false);
                                setSelectedItemKeys([]);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer text-center"
                            >
                              Origin Search
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectorError("");
                                const selectedNames = selectedItemKeys.map(key => {
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
                                setIsSelectingMode(false);
                                setSelectedItemKeys([]);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer text-center"
                            >
                              Compare Food
                            </button>
                          </div>
                        </div>
                      )}
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
        const resolvedImgSrc = (resolvedMessageImages.length > 0)
          ? resolvedMessageImages[imgIdx >= 0 && imgIdx < resolvedMessageImages.length ? imgIdx : 0]
          : getFoodImageUrl(item.name, '');
        const bb = item.boundingBox2D || (matchingScout ? matchingScout.boundingBox2D : null);
        const itemDisplayName = showTranslated ? (item.keyword || item.name) : (item.originalName || item.name);
        return (
          <ZoomableImage 
            src={resolvedImgSrc} 
            boundingBox={bb}
            onClose={() => setPreviewState(null)}
            foodName={itemDisplayName}
            hasNext={previewState.itemIdx < group.items.length - 1}
            hasPrev={previewState.itemIdx > 0}
            onNext={() => setPreviewState(prev => prev ? { ...prev, itemIdx: prev.itemIdx + 1 } : null)}
            onPrev={() => setPreviewState(prev => prev ? { ...prev, itemIdx: prev.itemIdx - 1 } : null)}
          />
        );
      })()}
      {(() => {
        if (scoutPreviewIdx === null) return null;
        const activeScoutItems = (() => {
          if (msg.data?.scoutItems && msg.data.scoutItems.length > 0) {
            return msg.data.scoutItems;
          }
          for (let mIdx = (messages ? messages.length - 1 : -1); mIdx >= 0; mIdx--) {
            if (messages[mIdx].data?.scoutItems && messages[mIdx].data.scoutItems.length > 0) {
              return messages[mIdx].data.scoutItems;
            }
          }
          return [];
        })();
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
      {originPreview && (() => {
        const item = msg.data?.origins?.[originPreview.itemIdx];
        if (!item) return null;
        const queries = (item.imageQueries || [item.foodName]).slice(0, 3);
        const validIndices = queries.map((_, i) => i).filter(i => !brokenOriginImages[`${originPreview.itemIdx}-${i}`]);
        if (validIndices.length === 0) return null;
        const currentValidPos = validIndices.indexOf(originPreview.imgIdx);
        if (currentValidPos === -1) return null;

        const resolvedData = originImagesRef.current[`${originPreview.itemIdx}-${originPreview.imgIdx}`];
        const src = resolvedData?.imageUrl || getFoodImageUrl(item.foodName, '');
        const pageUrl = resolvedData?.pageUrl;

        return (
          <ZoomableImage
            src={src}
            onClose={() => setOriginPreview(null)}
            foodName={item.foodName}
            sourceUrl={pageUrl}
            hasNext={currentValidPos < validIndices.length - 1}
            hasPrev={currentValidPos > 0}
            onNext={() => setOriginPreview({ itemIdx: originPreview.itemIdx, imgIdx: validIndices[currentValidPos + 1] })}
            onPrev={() => setOriginPreview({ itemIdx: originPreview.itemIdx, imgIdx: validIndices[currentValidPos - 1] })}
          />
        );
      })()}
      {/* Case F: Food Origin & Details experiential encyclopedia card renderer */}
      {msg.data?.mode === 'origin' && msg.data?.origins && msg.data.origins.length > 0 && (
        <div className="space-y-3.5 animation-fade-in w-full max-w-full min-w-0 overflow-hidden bg-transparent font-sans text-left mb-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5 w-full">
              <span>🗺️ Discovery:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">Culinary Origins & History</span>
            </h4>
          </div>

          {/* Horizontally scrollable culinary cards with vertical dividers */}
          <div className="flex gap-0 mt-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full overscroll-x-contain">
            {msg.data.origins.map((item: any, oIdx: number) => (
              <React.Fragment key={oIdx}>
                {oIdx > 0 && (
                  <div className="w-[1px] bg-slate-200 dark:bg-slate-800 self-stretch my-2 shrink-0 mx-[10px]" />
                )}
                <div className="w-[90%] sm:w-[420px] shrink-0 snap-align-start flex flex-col relative space-y-3.5">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-[15px] leading-snug">
                      {item.foodName}
                    </h4>
                  </div>

                  {/* Horizontal Scrollable Carousel of 1-3 food pictures with interactive click-to-zoom */}
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200/50 w-full snap-x snap-mandatory">
                    {(item.imageQueries || [item.foodName]).slice(0, 3).map((queryStr: string, imgIdx: number) => {
                      if (brokenOriginImages[`${oIdx}-${imgIdx}`]) return null;
                      const backupUrl = getFoodImageUrl(item.foodName, '');
                      return (
                        <div 
                          key={imgIdx} 
                          onClick={() => setOriginPreview({ itemIdx: oIdx, imgIdx })}
                          className="w-[90%] sm:w-80 h-48 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 relative shadow-inner snap-start cursor-zoom-in hover:opacity-90 transition-opacity"
                        >
                          <OriginImageTile 
                            queryStr={queryStr} 
                            fallbackSrc={backupUrl}
                            onResolved={(url: string, pageUrl: string) => {
                              originImagesRef.current[`${oIdx}-${imgIdx}`] = { imageUrl: url, pageUrl };
                            }}
                            onError={() => setBrokenOriginImages(prev => ({ ...prev, [`${oIdx}-${imgIdx}`]: true }))}
                          />
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/65 text-[8.5px] font-bold text-white tracking-wide uppercase">
                            View 🔍
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Descriptive fields */}
                  <div className="text-[12px] space-y-2.5 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <div className="p-3 rounded-lg bg-slate-50/55 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                      <strong className="text-slate-900 dark:text-white flex items-center gap-1 mb-0.5 text-[11px] uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                        🌍 Origin & Heritage
                      </strong>
                      <span className="text-slate-600 dark:text-slate-350">{item.origin}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50/55 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                      <strong className="text-slate-900 dark:text-white flex items-center gap-1 mb-0.5 text-[11px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        🍳 Traditional Cooking
                      </strong>
                      <span className="text-slate-600 dark:text-slate-350">{item.howItIsCooked}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50/55 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                      <strong className="text-slate-900 dark:text-white flex items-center gap-1 mb-0.5 text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        🍽️ Typical Occasions
                      </strong>
                      <span className="text-slate-600 dark:text-slate-350">{item.whenItIsEaten}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-indigo-100/50 dark:border-indigo-950/40 text-[11px] leading-normal italic text-slate-600 dark:text-slate-400 shadow-sm">
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5 not-italic uppercase tracking-wide text-[9.5px]">
                        Clinical Impact & Recommendation:
                      </strong>
                      {item.healthImpact}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
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
                      


                      {(() => {
                        const activeScoutItems = (() => {
                          if (msg.data?.scoutItems && msg.data.scoutItems.length > 0) {
                            return msg.data.scoutItems;
                          }
                          // Lookup in historical messages if current correction message cleared scoutItems
                          for (let mIdx = (messages ? messages.length - 1 : -1); mIdx >= 0; mIdx--) {
                            if (messages[mIdx].data?.scoutItems && messages[mIdx].data.scoutItems.length > 0) {
                              return messages[mIdx].data.scoutItems;
                            }
                          }
                          return [];
                        })();
                        if (activeScoutItems.length === 0) return null;
                        return (
                          <div className="mb-6 text-left">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/50 pb-2 font-sans">
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
                            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x snap-mandatory w-full">
                              {activeScoutItems.map((item: any, i: number) => {
                                const imgIdx = typeof item.sourceImageIndex === 'number' ? item.sourceImageIndex : 0;
                                const resolvedImgSrc = (messageImages.length > 0)
                                  ? messageImages[imgIdx >= 0 && imgIdx < messageImages.length ? imgIdx : 0]
                                  : getFoodImageUrl(item.keyword);
                                return (
                                  <div key={i} className="flex flex-col items-center gap-1 shrink-0 snap-align-start w-[72px]">
                                    <div 
                                      className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200/50 dark:border-slate-700/50 hover:scale-105 active:scale-95 transition-all shadow-sm"
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
                                    <span className="text-[9px] text-center font-medium leading-tight text-slate-500 truncate w-full">
                                      {item.originalName || item.keyword}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

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
