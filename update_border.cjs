const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const target = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto transition-all duration-300';
const repl = 'bg-white dark:bg-slate-900 shadow-2xl flex flex-col animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto transition-all duration-300 ${themePreviewMode ? "border-r border-slate-200 dark:border-slate-800" : "border border-slate-200 dark:border-slate-800"}';

code = code.replace(target, repl);
fs.writeFileSync('src/components/Header.tsx', code);
