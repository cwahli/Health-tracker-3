const fs = require('fs');
let content = fs.readFileSync('src/components/BackupRestoreTab.tsx', 'utf8');

const targetState = `  const [stagedBio, setStagedBio] = useState<BiomarkerLog[]>([]);`;
const replacementState = `  const [stagedBio, setStagedBio] = useState<BiomarkerLog[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [selectedBio, setSelectedBio] = useState<Set<string>>(new Set());`;

content = content.replace(targetState, replacementState);

const targetStaged = `         setStagedFoods(newFoods);
         setStagedBio(newBio);
         setShowConflicts(true);`;
const replacementStaged = `         setStagedFoods(newFoods);
         setStagedBio(newBio);
         setSelectedFoods(new Set(newFoods.map(f => f.id)));
         setSelectedBio(new Set(newBio.map(b => b.id)));
         setShowConflicts(true);`;

content = content.replace(targetStaged, replacementStaged);

const targetApply = `  const handleApplyImport = () => {
     if (stagedFoods.length > 0) {
         const mergedFoods = [...foodLogs];
         const map = new Map(mergedFoods.map(f => [f.id, f]));
         stagedFoods.forEach(f => map.set(f.id, f));
         setFoodLogs(Array.from(map.values()));
     }
     
     if (stagedBio.length > 0) {
         const mergedBio = [...biomarkerHistory];
         const map = new Map(mergedBio.map(b => [b.id, b]));
         stagedBio.forEach(b => map.set(b.id, b));
         setBiomarkerHistory(Array.from(map.values()));
     }`;
const replacementApply = `  const handleApplyImport = () => {
     const foodsToImport = stagedFoods.filter(f => selectedFoods.has(f.id));
     if (foodsToImport.length > 0) {
         const mergedFoods = [...foodLogs];
         const map = new Map(mergedFoods.map(f => [f.id, f]));
         foodsToImport.forEach(f => map.set(f.id, f));
         setFoodLogs(Array.from(map.values()));
     }
     
     const bioToImport = stagedBio.filter(b => selectedBio.has(b.id));
     if (bioToImport.length > 0) {
         const mergedBio = [...biomarkerHistory];
         const map = new Map(mergedBio.map(b => [b.id, b]));
         bioToImport.forEach(b => map.set(b.id, b));
         setBiomarkerHistory(Array.from(map.values()));
     }`;

content = content.replace(targetApply, replacementApply);

const targetUI = `                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {stagedFoods.map(f => (
                       <div key={f.id} className="text-xs text-slate-400 flex items-center justify-between">
                         <span className="truncate flex-1">{f.name}</span>
                         <span className="text-slate-500 w-24 text-right">{f.date?.slice(0,10)}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {stagedBio.length > 0 && (
                 <div className="bg-slate-800 rounded-lg p-3">
                   <h4 className="text-sm font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-2">Biomarkers ({stagedBio.length})</h4>
                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {stagedBio.map(b => (
                       <div key={b.id} className="text-xs text-slate-400 flex items-center justify-between">
                         <span className="truncate flex-1">Record from {b.date?.slice(0,10)}</span>
                         <span className="text-slate-500 w-24 text-right">{Object.keys(b.biomarkers || {}).length} items</span>
                       </div>
                     ))}
                   </div>`;
                   
const replacementUI = `                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {stagedFoods.map(f => (
                       <label key={f.id} className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                         <input type="checkbox" checked={selectedFoods.has(f.id)} onChange={(e) => {
                             const next = new Set(selectedFoods);
                             if (e.target.checked) next.add(f.id); else next.delete(f.id);
                             setSelectedFoods(next);
                         }} className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                         <span className="truncate flex-1 font-medium">{f.name}</span>
                         <span className="text-slate-500 w-24 text-right">{f.date?.slice(0,10)}</span>
                         <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                           {f.sync_state === 'new' ? 'New' : 'Differs'}
                         </span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}

               {stagedBio.length > 0 && (
                 <div className="bg-slate-800 rounded-lg p-3">
                   <h4 className="text-sm font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-2">Biomarkers ({stagedBio.length})</h4>
                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {stagedBio.map(b => (
                       <label key={b.id} className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                         <input type="checkbox" checked={selectedBio.has(b.id)} onChange={(e) => {
                             const next = new Set(selectedBio);
                             if (e.target.checked) next.add(b.id); else next.delete(b.id);
                             setSelectedBio(next);
                         }} className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                         <span className="truncate flex-1 font-medium">Record from {b.date?.slice(0,10)}</span>
                         <span className="text-slate-500 w-24 text-right">{Object.keys(b.biomarkers || {}).length} items</span>
                         <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                           {b.sync_state === 'new' ? 'New' : 'Differs'}
                         </span>
                       </label>
                     ))}
                   </div>`;

content = content.replace(targetUI, replacementUI);
fs.writeFileSync('src/components/BackupRestoreTab.tsx', content);
console.log("Patched BackupRestoreTab UI");
