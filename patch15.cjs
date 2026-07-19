const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const target1 = `              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Google Health Integration</span>
              <GoogleHealthIntegration profile={profile} />
              
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Preferences & Session</span>`;

const replacement1 = `              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Preferences & Session</span>`;

content = content.replace(target1, replacement1);

const target2 = `              ) : dbOverlayViewMode === 'admin' && activeAdminTab === 'backup' ? (
                <BackupRestoreTab 
                   profile={profile} 
                   foodLogs={foodLogs || []} 
                   biomarkerHistory={biomarkerHistory || []} 
                   setFoodLogs={setFoodLogs || (() => {})} 
                   setBiomarkerHistory={setBiomarkerHistory || (() => {})} 
                />
              ) : (`;

const replacement2 = `              ) : dbOverlayViewMode === 'admin' && activeAdminTab === 'backup' ? (
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pb-8">
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 mx-4 mt-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                      <Cloud className="w-5 h-5 text-indigo-400" />
                      Google Workspace Integration
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Connect your Google account to enable Google Drive backup and sync capabilities for your health data.
                    </p>
                    <GoogleHealthIntegration profile={profile} />
                  </div>
                  <BackupRestoreTab 
                     profile={profile} 
                     foodLogs={foodLogs || []} 
                     biomarkerHistory={biomarkerHistory || []} 
                     setFoodLogs={setFoodLogs || (() => {})} 
                     setBiomarkerHistory={setBiomarkerHistory || (() => {})} 
                  />
                </div>
              ) : (`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/components/Header.tsx', content);
console.log("Moved GoogleHealthIntegration");
