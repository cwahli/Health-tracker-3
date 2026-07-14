const fs = require('fs');
let code = fs.readFileSync('src/components/ZoomableImage.tsx', 'utf8');

code = code.replace(
  /onLoad=\{\(\) => \{[\s\S]*?\}\}/g,
  `onLoad={() => {
                        // Image loaded
                      }}`
);

code = code.replace(
  /const targetRef = useRef<HTMLDivElement>\(null\);/g,
  `const targetRef = useRef<HTMLDivElement>(null);
  const { zoomToElement } = React.useContext(React.createContext({ zoomToElement: (el: any, scale: any, time: any) => {} })); // Just a placeholder, we'll get it from render props`
);

// We can just use an ID for zoomToElement to avoid ref timing issues!
code = code.replace(
  /ref=\{targetRef\}/g,
  `id="zoom-target-bbox"`
);

code = code.replace(
  /onLoad=\{\(\) => \{[\s\S]*?\}\}/g,
  `onLoad={() => {
                        if (boundingBox && boundingBox.length === 4) {
                          const bboxWidth = (boundingBox[3] - boundingBox[1]) / 1000;
                          const bboxHeight = (boundingBox[2] - boundingBox[0]) / 1000;
                          const maxBboxSize = Math.max(bboxWidth, bboxHeight);
                          const targetScale = Math.min(0.95 / (maxBboxSize || 1), 40);
                          
                          setTimeout(() => {
                            const el = document.getElementById('zoom-target-bbox');
                            if (el) zoomToElement(el, targetScale, 500);
                          }, 150);
                        }
                      }}`
);


fs.writeFileSync('src/components/ZoomableImage.tsx', code);
console.log('ZoomableImage updated');
