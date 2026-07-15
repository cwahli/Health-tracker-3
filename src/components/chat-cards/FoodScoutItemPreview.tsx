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
}

export const FoodScoutItemPreview: React.FC<FoodScoutItemPreviewProps> = ({
  name,
  src,
  boundingBox,
  imgIdx,
  messageImages,
  onClick,
  aspectClassName = "aspect-square"
}) => {
  return (
    <div className="flex flex-col items-center gap-1 w-full text-center">
      <div 
        className={`w-full ${aspectClassName} rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 cursor-pointer shadow-sm hover:ring-2 ring-indigo-500/50 transition-all shrink-0`}
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
      <span className="text-[10px] text-center font-medium leading-tight text-slate-700 dark:text-slate-300 break-words w-full lowercase">
        {name}
      </span>
    </div>
  );
};
