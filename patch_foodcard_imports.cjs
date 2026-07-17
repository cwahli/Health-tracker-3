const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');
code = code.replace(
  "import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2, Eye } from 'lucide-react';",
  "import { Plus, Check, ChevronDown, ChevronUp, Sparkles, Search, X, Trash2, Eye, Camera } from 'lucide-react';"
);

const targetReplacement = `
                                       <button 
                                         onClick={() => { document.getElementById('food-chat-input')?.focus(); }} 
                                         className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 py-1.5 px-3 rounded-md shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all text-center"
                                       >
                                         <Camera className="w-3.5 h-3.5" />
                                         <Search className="w-3.5 h-3.5" />
                                         Update
                                       </button>
`;

code = code.replace(
  /<button[\s\S]*?onClick=\{\(\) => \{ document\.getElementById\('food-chat-input'\)\?\.focus\(\); \}\}[\s\S]*?<\/button>/,
  targetReplacement.trim()
);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('Patched imports and icons');
