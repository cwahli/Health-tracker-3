const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const targetStr = `  if (error) {
    return (
      <img 
        src={baseImageSrc} 
        alt={alt} 
        className={className}
        referrerPolicy="no-referrer"
        onClick={onTap}
      />
    );
  }`;

const newCode = `  if (error) {
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
      <div className={\`overflow-hidden relative \${className || ''}\`} onClick={onTap} title={alt}>
        <img 
          src={baseImageSrc} 
          alt={alt}
          referrerPolicy="no-referrer"
          className="absolute max-w-none"
          style={{
            top: \`-\${top * scaleY}%\`,
            left: \`-\${left * scaleX}%\`,
            width: \`\${100 * scaleX}%\`,
            height: \`\${100 * scaleY}%\`,
            objectFit: 'fill'
          }}
        />
      </div>
    );
  }`;

code = code.replace(targetStr, newCode);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('FoodCard fallback patched');
