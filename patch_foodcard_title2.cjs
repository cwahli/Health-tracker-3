const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const titleOld = `                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 gap-2 text-left">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate min-w-0 font-display">
                          {msg.data?.pendingFoodLog.name}
                        </h4>
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 font-sans">
                          {msg.data?.pendingFoodLog.weightGrams}g ({msg.data?.pendingFoodLog.quantity})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium border-b border-slate-100 dark:border-slate-800/50 pb-2 font-sans">
                        <span className="text-slate-500">Record Date:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{msg.data?.pendingFoodLog.date}</span>
                      </div>`;

const titleNew = `                      <div className="flex flex-col items-start border-b border-slate-100 dark:border-slate-800/50 pb-3 gap-2 text-left">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-display leading-tight">
                          {msg.data?.pendingFoodLog.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold font-sans">
                            {msg.data?.pendingFoodLog.weightGrams}g ({msg.data?.pendingFoodLog.quantity})
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{msg.data?.pendingFoodLog.date}</span>
                        </div>
                      </div>

                      {msg.content && (
                        <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-left py-2 border-b border-slate-100 dark:border-slate-800/50 whitespace-pre-line break-words">
                          {typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content}
                        </div>
                      )}`;

if (code.includes(titleOld)) {
  code = code.replace(titleOld, titleNew);
  console.log("Success patch title2");
} else {
  console.log("Failed patch title2");
}

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
