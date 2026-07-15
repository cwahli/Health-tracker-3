import React, { useRef, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
interface ZoomableImageProps {
  src: string;
  boundingBox?: number[];
  onClose: () => void;
  foodName?: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}
export const ZoomableImage: React.FC<ZoomableImageProps> = ({ 
  src, 
  boundingBox, 
  onClose,
  foodName,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) => {
  const targetRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      <style>{`
        @keyframes highlightPulse {
          0% {
            opacity: 0.3;
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.9), inset 0 0 0 0 rgba(52, 211, 153, 0.4);
            transform: scale(0.96);
          }
          15% {
            opacity: 1;
            transform: scale(1.04);
            box-shadow: 0 0 0 15px rgba(52, 211, 153, 0), inset 0 0 15px 8px rgba(52, 211, 153, 0.3);
          }
          35% {
            transform: scale(1);
          }
          100% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(52, 211, 153, 0.5), inset 0 0 8px 4px rgba(52, 211, 153, 0.1);
          }
        }
        .animate-highlight-flash {
          animation: highlightPulse 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
      <div 
        className="relative max-w-[100vw] max-h-[100vh] w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Title Bubble at the top */}
        {foodName && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-slate-900/90 text-white rounded-full font-semibold text-sm tracking-wide border border-slate-700/80 shadow-2xl z-[10000] text-center max-w-[80vw] truncate">
            {foodName}
          </div>
        )}
        <TransformWrapper
          key={src}
          initialScale={1}
          minScale={0.5}
          maxScale={40}
          centerOnInit={true}
        >
          {({ zoomToElement }) => {
            return (
              <>
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                  <div className="relative inline-block max-w-[95vw] max-h-[85vh]">
                    <img 
                      src={src} 
                      alt={foodName || "Full screen preview"} 
                      className="max-w-[95vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                    {boundingBox && boundingBox.length === 4 && (
                      <ZoomTrigger boundingBox={boundingBox} zoomToElement={zoomToElement} />
                    )}
                    {boundingBox && boundingBox.length === 4 && (
                      <div 
                        key={foodName + "_" + (boundingBox ? boundingBox.join(",") : "")}
                        id="zoom-target-bbox"
                        className="absolute pointer-events-none rounded-md ring-[4px] ring-emerald-400 bg-emerald-400/20 animate-highlight-flash"
                        style={{
                          top: `${boundingBox[0] / 10}%`,
                          left: `${boundingBox[1] / 10}%`,
                          height: `${(boundingBox[2] - boundingBox[0]) / 10}%`,
                          width: `${(boundingBox[3] - boundingBox[1]) / 10}%`,
                        }}
                      />
                    )}
                  </div>
                </TransformComponent>
                {/* Left Navigation Chevron */}
                {hasPrev && onPrev && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-white rounded-full font-bold shadow-2xl border border-slate-700/60 cursor-pointer transition-all active:scale-95 z-[10000] text-xl"
                    aria-label="Previous item"
                  >
                    ‹
                  </button>
                )}
                {/* Right Navigation Chevron */}
                {hasNext && onNext && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-white rounded-full font-bold shadow-2xl border border-slate-700/60 cursor-pointer transition-all active:scale-95 z-[10000] text-xl"
                    aria-label="Next item"
                  >
                    ›
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full font-bold text-sm border border-slate-700 shadow-xl transition-all cursor-pointer z-[10000]"
                >
                  Close Preview
                </button>
              </>
            );
          }}
        </TransformWrapper>
      </div>
    </div>
  );
};
const ZoomTrigger = ({ boundingBox, zoomToElement }: { boundingBox: number[], zoomToElement: any }) => {
  React.useEffect(() => {
    if (boundingBox && boundingBox.length === 4) {
      const bboxWidth = (boundingBox[3] - boundingBox[1]) / 1000;
      const bboxHeight = (boundingBox[2] - boundingBox[0]) / 1000;
      const maxBboxSize = Math.max(bboxWidth, bboxHeight);
      const targetScale = Math.min(0.95 / (maxBboxSize || 1), 40);
      
      const timer = setTimeout(() => {
        const el = document.getElementById('zoom-target-bbox');
        if (el) zoomToElement(el, targetScale, 450);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [boundingBox, zoomToElement]);
  return null;
};
