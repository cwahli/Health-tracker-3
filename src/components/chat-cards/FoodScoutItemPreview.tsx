import * as React from 'react';
import { CroppedFoodImage } from './FoodCard';

const OnlineFoodImage: React.FC<{ foodName: string; fallbackSrc: string; className?: string; onImageLoaded?: (url: string) => void }> = ({ foodName, fallbackSrc, className, onImageLoaded }) => {
  const [src, setSrc] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  const fetchImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (searched || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/gemini/food-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: foodName }),
      });
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setSrc(data.images[0].imageUrl);
        if (onImageLoaded) onImageLoaded(data.images[0].imageUrl);
      }
    } catch (err) {
      console.warn("Online search failed for", foodName, err);
    } finally {
      setLoading(false);
    }
  };

  if (!searched) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-2 transition-all"
        onClick={fetchImage}
        title="Click to search image online"
      >
        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
          Load Image
        </span>
      </div>
    );
  }

  return (
    <img 
      src={src || fallbackSrc} 
      alt={foodName} 
      className={`${className} ${loading ? 'animate-pulse bg-slate-100 dark:bg-slate-800' : ''}`}
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
  onClick: (url?: string) => void;
  aspectClassName?: string;
  isActive?: boolean;
  isSearchMode?: boolean;
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
  isSearchMode = false
}) => {
  const [loadedSrc, setLoadedSrc] = React.useState<string | undefined>(undefined);
  return (
    <div className="flex flex-col items-center gap-1.5 w-full text-center">
      <div 
        className={`w-full ${aspectClassName} rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 cursor-pointer shadow-sm transition-all duration-200 shrink-0 ${
          isActive 
            ? "ring-4 ring-indigo-500 scale-[1.03] shadow-md" 
            : isSearchMode 
              ? "hover:ring-2 ring-indigo-400/50 hover:scale-[1.01]" 
              : "hover:ring-2 ring-indigo-500/30"
        }`}
        onClick={() => onClick(loadedSrc)}
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
            onImageLoaded={setLoadedSrc}
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
