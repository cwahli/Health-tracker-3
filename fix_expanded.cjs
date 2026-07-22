const fs = require('fs');
let code = fs.readFileSync('src/components/BiomarkerExpandedSection.tsx', 'utf-8');

code = code.replace(/color: '#64748b'/g, "color: 'var(--color-slate-500)'");
code = code.replace(/stroke="#f87171"/g, 'stroke="var(--color-rose-500)"');
code = code.replace(/stroke="#4f46e5"/g, 'stroke="var(--color-indigo-600)"');
code = code.replace(/fill: '#4f46e5'/g, "fill: 'var(--color-indigo-600)'");
fs.writeFileSync('src/components/BiomarkerExpandedSection.tsx', code);
