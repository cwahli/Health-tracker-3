const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const oldOriginTile = `const OriginImageTile = ({ queryStr, fallbackSrc, onResolved, onClick, onError }: any) => {
  const [src, setSrc] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await fetch("/api/gemini/food-image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryStr }),
        });
        const data = await res.json();
        if (active && data.images && data.images.length > 0) {
          const img = data.images[0];
          setSrc(img.imageUrl);
          if (onResolved) onResolved(img.imageUrl, img.pageUrl);
        }
      } catch (err) {
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [queryStr]);

  return (
    <img
      src={src || fallbackSrc}
      alt={queryStr}
      className={\`w-full h-full object-cover animate-fade-in \${loading ? 'animate-pulse bg-slate-100 dark:bg-slate-800' : ''}\`}
      referrerPolicy="no-referrer"
      onClick={onClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
        if (onError) onError();
      }}
    />
  );
};`;

const newOriginTile = `const OriginImageTile = ({ queryStr, fallbackSrc, onResolved, onClick, onError }: any) => {
  const [src, setSrc] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  
  const handleLoad = async (e: any) => {
    e.stopPropagation();
    if (searched || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/gemini/food-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryStr }),
      });
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const img = data.images[0];
        setSrc(img.imageUrl);
        if (onResolved) onResolved(img.imageUrl, img.pageUrl);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (!searched) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={handleLoad}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full shadow-sm text-xs font-medium text-slate-600 dark:text-slate-300">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Search Image
        </div>
      </div>
    );
  }

  return (
    <img
      src={src || fallbackSrc}
      alt={queryStr}
      className={\`w-full h-full object-cover animate-fade-in \${loading ? 'animate-pulse bg-slate-200 dark:bg-slate-800' : ''}\`}
      referrerPolicy="no-referrer"
      onClick={onClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
        if (onError) onError();
      }}
    />
  );
};`;

code = code.replace(oldOriginTile, newOriginTile);
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log("Patched OriginImageTile!");
