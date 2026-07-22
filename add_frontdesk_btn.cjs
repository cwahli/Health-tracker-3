const fs = require('fs');
let content = fs.readFileSync('src/components/InsightsTab.tsx', 'utf-8');

const btnHtml = `
      {onOpenFrontDesk && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl">
              <Stethoscope className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Health Front Desk</h3>
              <p className="text-xs text-slate-500">Ask a question or find out what to do next</p>
            </div>
          </div>
          <button
            onClick={onOpenFrontDesk}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Ask Front Desk
          </button>
        </div>
      )}
`;

content = content.replace(/<div id="agent-diagnostics-dashboard"/, btnHtml + '\n      <div id="agent-diagnostics-dashboard"');
fs.writeFileSync('src/components/InsightsTab.tsx', content);
