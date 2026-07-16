const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  `  // Declare global variable for window
  declare global {
    interface Window {
      sessionSyncTriggered?: boolean;
    }
  }`,
  ``
);

const topImport = `import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';`;
const newTopImport = `import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

declare global {
  interface Window {
    sessionSyncTriggered?: boolean;
  }
}
`;

appCode = appCode.replace(topImport, newTopImport);
fs.writeFileSync('src/App.tsx', appCode);

let foodCardCode = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const targetButton = `                                               <button
                                                 type="button"
                                                 onClick={() => setShowTranslations(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                                 className={\`p-1 hover:bg-slate-100 dark:bg-slate-850 rounded-md transition-all cursor-pointer \${
                                                   showTranslations[groupKey] ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400'
                                                 }\`}`;

// Wait, groupKey is not declared yet?
// Ah! In FoodCard.tsx, groupKey is defined lower down!
// Let's see where it is.
