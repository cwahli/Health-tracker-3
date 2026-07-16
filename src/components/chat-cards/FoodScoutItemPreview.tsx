import * as React from 'react';
import { CroppedFoodImage } from './FoodCard';
export const OnlineFoodImage: React.FC<{ 
  foodName: string; 
  fallbackSrc: string; 
  className?: string;
  searchMode?: "light" | "complete";
  prefetchedSrc?: string;
}> = ({ 
  foodName, 
  fallbackSrc, 
  className,
  searchMode = "light",
  prefetchedSrc
}) => {
  const [src, setSrc] = React.useState<string>(prefetchedSrc || "");
  const [loading, setLoading] = React.useState(!prefetchedSrc);
  React.useEffect(() => {
    if (prefetchedSrc) {
      setSrc(prefetchedSrc);
      setLoading(false);
      return;
    }
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await fetch("/api/gemini/food-image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: foodName, mode: searchMode }),
        });
        const data = await res.json();
        if (active && data.images && data.images.length > 0) {
          setSrc(data.images[0].imageUrl);
        }
      } catch (err) {
        console.warn("Online search failed for", foodName, err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [foodName, searchMode, prefetchedSrc]);
  return (
    <img 
      src={src || fallbackSrc} 
      alt={foodName} 
      className={`${className} ${loading ? 'animate-pulse bg-slate-100 dark:bg-slate-800' : ''}`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
    />
  );
};
interface FoodScoutItemPreviewProps {
  name: string;
  src: string;
  boundingBox: [number, number, number, number] | null;
  imgIdx?: number | null;
  messageImages: string[];
  onClick: () => void;
  aspectClassName?: string;
  isActive?: boolean;
  isSearchMode?: boolean;
  searchMode?: "light" | "complete";
  prefetchedSrc?: string;
}
export const FoodScoutItemPreview: React.FC<FoodScoutItemPreviewProps> = ({
  name,
  src,
  boundingBox,
  imgIdx,
  messageImages,
  onClick,
  aspectClassName = "aspect-square",
  isActive = false,
  isSearchMode = false,
  searchMode = "light",
  prefetchedSrc
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full text-center">
      <div 
        className={`w-full ${aspectClassName} rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-855 cursor-pointer shadow-sm transition-all duration-200 shrink-0 ${
          isActive 
            ? "ring-4 ring-indigo-500 scale-[1.03] shadow-md" 
            : isSearchMode 
              ? "hover:ring-2 ring-indigo-400/50 hover:scale-[1.01]" 
              : "hover:ring-2 ring-indigo-500/30"
        }`}
        onClick={onClick}
      >
        {boundingBox ? (
          <CroppedFoodImage 
            src={src} 
            boundingBox={boundingBox} 
            alt={name} 
            className="w-full h-full object-cover"
            imageUrls={messageImages}
            sourceImageIndex={imgIdx}
          />
        ) : (
          <OnlineFoodImage 
            foodName={name} 
            fallbackSrc={src} 
            className="w-full h-full object-cover"
            searchMode={searchMode}
            prefetchedSrc={prefetchedSrc}
          />
        )}
      </div>
      <span className={`text-[10px] text-center font-medium leading-tight break-words w-full lowercase ${
        isActive ? "text-indigo-600 dark:text-indigo-400 font-bold underline" : "text-slate-700 dark:text-slate-300"
      }`}>
        {name}
      </span>
    </div>
  );
};
