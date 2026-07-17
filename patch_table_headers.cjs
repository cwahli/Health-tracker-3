const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/NutritionLabelTable.tsx', 'utf8');

const target = `                      <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Nutrient
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Original Label
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 whitespace-nowrap">
                          Total value {missingWeight ? '(N/A)' : \`(\${item.estimatedWeightGrams}g)\`}
                        </th>
                      </tr>`;

const replacement = `                      <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Nutrient
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                          Original
                        </th>
                        <th className="py-1.5 px-2 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 whitespace-nowrap">
                          Total
                        </th>
                      </tr>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', content);
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
