const fs = require('fs');
let code = fs.readFileSync('src/components/ZoomableImage.tsx', 'utf8');

code = code.replace(
  /onLoad=\{\(\) => \{[\s\S]*?\}\}/g,
  `onLoad={() => {
                        // handled by useEffect
                      }}`
);

code = code.replace(
  /\{boundingBox && boundingBox\.length === 4 && \(/g,
  `{boundingBox && boundingBox.length === 4 && (
                      <ZoomTrigger boundingBox={boundingBox} zoomToElement={zoomToElement} />
                    )}
                    {boundingBox && boundingBox.length === 4 && (`
);

code += `\n
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
`;

fs.writeFileSync('src/components/ZoomableImage.tsx', code);
console.log('ZoomableImage robust trigger patched');
