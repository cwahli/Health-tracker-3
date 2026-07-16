const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodScoutItemPreview.tsx', 'utf8');

const oldStr = `        ) : (
          <OnlineFoodImage 
            foodName={name} 
            fallbackSrc={src} 
            className="w-full h-full object-cover"
          />
        )}`;
const newStr = `        ) : (
          <OnlineFoodImage 
            foodName={name} 
            fallbackSrc={src} 
            className="w-full h-full object-cover"
            onImageLoaded={setLoadedSrc}
          />
        )}`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  console.log("Success patch foodscout");
} else {
  console.log("Failed patch foodscout");
}

fs.writeFileSync('src/components/chat-cards/FoodScoutItemPreview.tsx', code);
