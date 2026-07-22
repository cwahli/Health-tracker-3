const fs = require('fs');
let code = fs.readFileSync('src/components/TrendsTab.tsx', 'utf-8');

code = code.replace(/color: '#6366f1'/g, "color: 'var(--color-indigo-500)'");
code = code.replace(/color: '#f59e0b'/g, "color: 'var(--color-amber-500)'");
code = code.replace(/color: '#8b5cf6'/g, "color: 'var(--color-indigo-500)'");
code = code.replace(/color: '#ec4899'/g, "color: 'var(--color-rose-500)'");
code = code.replace(/color: '#10b981'/g, "color: 'var(--color-emerald-500)'");
code = code.replace(/stroke="#f1f5f9"/g, 'stroke="var(--color-slate-200)"');
code = code.replace(/stroke="#94a3b8"/g, 'stroke="var(--color-slate-500)"');
code = code.replace(/fill: '#94a3b8'/g, "fill: 'var(--color-slate-500)'");
code = code.replace(/background: '#0f172a'/g, "background: 'var(--color-slate-900)'");
code = code.replace(/color: '#fff'/g, "color: 'var(--color-slate-50)'");
code = code.replace(/stroke="#6366f1"/g, 'stroke="var(--color-indigo-500)"');
code = code.replace(/fill: '#6366f1'/g, "fill: 'var(--color-indigo-500)'");
code = code.replace(/#ef4444/g, "var(--color-rose-500)");
code = code.replace(/#ffffff/g, "var(--color-slate-50)");
fs.writeFileSync('src/components/TrendsTab.tsx', code);
