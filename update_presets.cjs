const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const presetsBlock = `
              {/* PRESETS SECTION */}
              {themeActiveSection === 'presets' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Saved Presets</h4>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const presets = profile.themePresets || [];
                        if (presets.length === 0) return;
                        const header = "Name,fontFamily,fontSize,button,background,bgCard,text,textSecondary,warning,caution,success,info,nutrientCalories,nutrientProtein,nutrientCarbs,nutrientFat,nutrientSatFat,nutrientSodium,marginScale,paddingScale,cornerRadius,shadowScale\\n";
                        const rows = presets.map(p => {
                          return \`"\${p.name || ''}",\${p.fontFamily || ''},\${p.fontSize || ''},\${p.themePalette?.button || ''},\${p.themePalette?.background || ''},\${p.themePalette?.bgCard || ''},\${p.themePalette?.text || ''},\${p.themePalette?.textSecondary || ''},\${p.themePalette?.warning || ''},\${p.themePalette?.caution || ''},\${p.themePalette?.success || ''},\${p.themePalette?.info || ''},\${p.themePalette?.nutrientCalories || ''},\${p.themePalette?.nutrientProtein || ''},\${p.themePalette?.nutrientCarbs || ''},\${p.themePalette?.nutrientFat || ''},\${p.themePalette?.nutrientSatFat || ''},\${p.themePalette?.nutrientSodium || ''},\${p.marginScale || ''},\${p.paddingScale || ''},\${p.cornerRadius || ''},\${p.shadowScale || ''}\`;
                        }).join("\\n");
                        const blob = new Blob([header + rows], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'theme_presets.csv';
                        a.click();
                      }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all">Export CSV</button>
                      
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        Import CSV
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string;
                            const lines = text.split('\\n');
                            if (lines.length > 1) {
                              const newPresets = [];
                              for (let i = 1; i < lines.length; i++) {
                                if (!lines[i].trim()) continue;
                                const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, ''));
                                newPresets.push({
                                  name: cols[0], fontFamily: cols[1], fontSize: cols[2],
                                  themePalette: { button: cols[3], background: cols[4], bgCard: cols[5], text: cols[6], textSecondary: cols[7], warning: cols[8], caution: cols[9], success: cols[10], info: cols[11], nutrientCalories: cols[12], nutrientProtein: cols[13], nutrientCarbs: cols[14], nutrientFat: cols[15], nutrientSatFat: cols[16], nutrientSodium: cols[17] },
                                  marginScale: cols[18], paddingScale: cols[19], cornerRadius: cols[20], shadowScale: cols[21]
                                });
                              }
                              setProfile({ ...profile, themePresets: [...(profile.themePresets || []), ...newPresets] });
                            }
                          };
                          reader.readAsText(file);
                        }} />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { name: "System Default", isSystem: true, profileUpdate: { marginScale: undefined, paddingScale: undefined, cornerRadius: undefined, shadowScale: undefined, themePalette: undefined, fontSize: undefined, fontFamily: undefined, fontMono: undefined } },
                        { name: "Midnight Blue (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Space Grotesk', themePalette: { background: '#0f172a', bgCard: '#1e293b', button: '#3b82f6', text: '#f8fafc', textSecondary: '#94a3b8', border: '#334155' } } },
                        { name: "Emerald Forest (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Outfit', themePalette: { background: '#064e3b', bgCard: '#022c22', button: '#10b981', text: '#ecfdf5', textSecondary: '#6ee7b7', border: '#065f46' } } },
                        { name: "Minimalist White (Light)", isSystem: true, profileUpdate: { fontFamily: 'Playfair Display', themePalette: { background: '#ffffff', bgCard: '#fafafa', button: '#18181b', text: '#09090b', textSecondary: '#71717a', border: '#e4e4e7' } } }
                      ].map((preset, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{preset.name}</span>
                          <button onClick={() => {
                            setProfile({ ...profile, ...preset.profileUpdate });
                          }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all">Apply</button>
                        </div>
                      ))}
                      {(profile.themePresets || []).map((preset: any, idx: number) => (
                        <div key={'user'+idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{preset.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setProfile({
                                ...profile,
                                themePalette: preset.themePalette,
                                fontSize: preset.fontSize,
                                fontFamily: preset.fontFamily,
                                fontMono: preset.fontMono,
                                marginScale: preset.marginScale,
                                paddingScale: preset.paddingScale,
                                cornerRadius: preset.cornerRadius,
                                shadowScale: preset.shadowScale
                              });
                            }} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-all">Apply</button>
                            <button onClick={() => {
                              const newPresets = profile.themePresets.filter((_: any, i: number) => i !== idx);
                              setProfile({ ...profile, themePresets: newPresets });
                            }} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-all">Del</button>
                          </div>
                        </div>
                      ))}
`;

code = code.replace(/\{\/\* PRESETS SECTION \*\/\}.*?(?=\{\/\* END PRESETS SECTION \*\/\})/s, presetsBlock);
fs.writeFileSync('src/components/Header.tsx', code);
