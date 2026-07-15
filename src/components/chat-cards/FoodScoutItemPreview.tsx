import * as React from 'react';
import { CroppedFoodImage } from './FoodCard';

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
          <img 
            src={src} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80&auto=format';
            }}
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
