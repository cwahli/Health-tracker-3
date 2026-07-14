import React, { useRef, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface ZoomableImageProps {
  src: string;
  boundingBox?: number[];
  onClose: () => void;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, boundingBox, onClose }) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { zoomToElement } = React.useContext(React.createContext({ zoomToElement: (el: any, scale: any, time: any) => {} })); // Just a placeholder, we'll get it from render props
  const [highlight, setHighlight] = useState(true);

  useEffect(() => {
    if (highlight) {
      const timer = setTimeout(() => setHighlight(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[100vw] max-h-[100vh] w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
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
                      alt="Full screen preview" 
                      className="max-w-[95vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
                      referrerPolicy="no-referrer"
                      onLoad={() => {
                        // handled by useEffect
                      }}
                    />
                    {boundingBox && boundingBox.length === 4 && (
                      <ZoomTrigger boundingBox={boundingBox} zoomToElement={zoomToElement} />
                    )}
                    {boundingBox && boundingBox.length === 4 && (
                      <div 
                        id="zoom-target-bbox"
                        className={`absolute pointer-events-none transition-all duration-700 ${highlight ? 'opacity-100 ring-[6px] ring-emerald-400 bg-emerald-400/20 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : 'opacity-0'} rounded-md`}
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
        if (el) zoomToElement(el, targetScale, 500);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [boundingBox, zoomToElement]);
  return null;
};
