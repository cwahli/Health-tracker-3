const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const targetLogChat = `<div className="p-4 bg-slate-900 border-slate-800 rounded-3xl shadow-xl flex items-center justify-center h-24">\n                     <span className="text-white text-sm font-semibold tracking-wide">LogChat UI Placeholder</span>\n                  </div>`;
const replLogChat = `
                  <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LogChat Bubble</span>
                    <div className="self-end bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-sm max-w-[85%] font-medium">
                      I had a grilled chicken salad and a glass of milk.
                    </div>
                    <div className="self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[85%] font-medium">
                      I've logged 1 chicken salad and 1 glass of milk. (450 kcal)
                    </div>
                  </div>
`;
code = code.replace(targetLogChat, replLogChat);

const targetFoodCard = `<div className="p-4 rounded-3xl flex items-center justify-center h-24">\n                     <span className="text-slate-800 dark:text-slate-100 text-sm font-semibold">FoodCard Capsule</span>\n                  </div>`;
const replFoodCard = `
                  <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FoodCard Capsule</span>
                    <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm items-center w-full">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0">
                        🥗
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Grilled Chicken Salad</span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5">350 kcal • 40g Protein</span>
                      </div>
                      <button className="text-slate-400 hover:text-rose-500 p-2 shrink-0">✕</button>
                    </div>
                  </div>
`;
code = code.replace(targetFoodCard, replFoodCard);

const targetBiomarker = `<div className="p-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center h-24">\n                     <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold">Biomarker Expanded Section</span>\n                  </div>`;
const replBiomarker = `
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col gap-3 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biomarker Expanded Section</span>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl w-full">
                      <div className="flex items-center gap-1.5 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                        <span>Medical Insight</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed font-medium">
                        Your LDL cholesterol is within optimal range. Maintaining this level reduces cardiovascular risks.
                      </p>
                    </div>
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm w-full">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">More Details</span>
                      <span className="text-slate-400 text-xs">▼</span>
                    </div>
                  </div>
`;
code = code.replace(targetBiomarker, replBiomarker);

fs.writeFileSync('src/components/Header.tsx', code);
