const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const presetsSectionRegex = /\{themeActiveSection === 'presets' && \([\s\S]*?\}\)/;

const newPresetsSection = `{themeActiveSection === 'presets' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Saved Presets</h4>
                      <div className="flex gap-2">
                        <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                          Import JSON
                          <input type="file" accept=".json" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              try {
                                const newPresets = JSON.parse(ev.target?.result as string);
                                if (Array.isArray(newPresets)) {
                                  setProfile({ ...profile, themePresets: [...(profile.themePresets || []), ...newPresets] });
                                }
                              } catch (e) {
                                console.error('Failed to parse presets');
                              }
                            };
                            reader.readAsText(file);
                          }} />
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { name: "System Default", isSystem: true, profileUpdate: { marginScale: undefined, paddingScale: undefined, cornerRadius: undefined, shadowScale: undefined, themePalette: undefined, fontSize: undefined, fontFamily: undefined, fontMono: undefined, fontSizeTitle: undefined, fontSizeSubtitle: undefined, fontSizeDescription: undefined, fontSizeBodySmall: undefined, fontSizeSubtitleSmall: undefined, fontSizeKeyMetric: undefined, fontSizeXS: undefined, fontSizeBody: undefined, themeOverrides: [] } },
                        { name: "Midnight Blue (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Space Grotesk', themePalette: { background: '#0f172a', bgCard: '#1e293b', button: '#3b82f6', text: '#f8fafc', textSecondary: '#94a3b8', border: '#334155' } } },
                        { name: "Emerald Forest (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Outfit', themePalette: { background: '#064e3b', bgCard: '#022c22', button: '#10b981', text: '#ecfdf5', textSecondary: '#6ee7b7', border: '#065f46' } } },
                        { name: "Minimalist White (Light)", isSystem: true, profileUpdate: { fontFamily: 'Playfair Display', themePalette: { background: '#ffffff', bgCard: '#fafafa', button: '#18181b', text: '#09090b', textSecondary: '#71717a', border: '#e4e4e7' } } }
                      ].map((preset, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{preset.name}</span>
                          <button onClick={() => {
                            setProfile({ ...profile, ...preset.profileUpdate });
                          }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all">Apply Default</button>
                        </div>
                      ))}
                      {(profile.themePresets || []).map((preset, idx) => (
                        <div key={'user'+idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex-1 truncate mr-2">{preset.name}</span>
                          <div className="flex gap-2 shrink-0">
                            <button title="Export" onClick={() => {
                              const blob = new Blob([JSON.stringify([preset], null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = \`\${preset.name || 'theme'}_preset.json\`;
                              a.click();
                            }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            </button>
                            <button onClick={() => {
                              const newPresets = [...(profile.themePresets || [])];
                              newPresets[idx] = {
                                ...preset,
                                themePalette: profile.themePalette,
                                fontSize: profile.fontSize,
                                fontFamily: profile.fontFamily,
                                fontMono: profile.fontMono,
                                marginScale: profile.marginScale,
                                paddingScale: profile.paddingScale,
                                cornerRadius: profile.cornerRadius,
                                shadowScale: profile.shadowScale,
                                themeOverrides: profile.themeOverrides
                              };
                              setProfile({ ...profile, themePresets: newPresets });
                            }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all">Update</button>
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
                                shadowScale: preset.shadowScale,
                                themeOverrides: preset.themeOverrides
                              });
                            }} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-all">Apply</button>
                            <button onClick={() => {
                              const newPresets = [...(profile.themePresets || [])];
                              newPresets.splice(idx, 1);
                              setProfile({ ...profile, themePresets: newPresets });
                            }} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all">Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Current Theme Status</h4>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {profile.themeOverrides?.length || 0} Variable Changes
                      </span>
                    </div>
                    <button onClick={() => {
                      const name = prompt("Enter a name for this preset:");
                      if (!name) return;
                      const newPreset = {
                        name,
                        themePalette: profile.themePalette,
                        fontSize: profile.fontSize,
                        fontFamily: profile.fontFamily,
                        fontMono: profile.fontMono,
                        marginScale: profile.marginScale,
                        paddingScale: profile.paddingScale,
                        cornerRadius: profile.cornerRadius,
                        shadowScale: profile.shadowScale,
                        themeOverrides: profile.themeOverrides
                      };
                      setProfile({ ...profile, themePresets: [...(profile.themePresets || []), newPreset] });
                    }} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center cursor-pointer">
                      Save Current Configuration as Preset
                    </button>
                  </div>
                </div>
              )}`;

code = code.replace(presetsSectionRegex, newPresetsSection);

fs.writeFileSync('src/components/Header.tsx', code);
