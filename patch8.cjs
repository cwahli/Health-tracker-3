const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const target1 = `  const [activeAdminTab, setActiveAdminTab] = useState<'sync' | 'users'>('sync');`;
const replacement1 = `  const [activeAdminTab, setActiveAdminTab] = useState<'sync' | 'users' | 'backup'>('sync');`;

const target2 = `                    onClick={() => setActiveAdminTab('sync')}
                    className={\`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer \${
                      activeAdminTab === 'sync'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }\`}
                  >
                    Sync, Telemetry & Backup
                  </button>`;
const replacement2 = `                    onClick={() => setActiveAdminTab('sync')}
                    className={\`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer \${
                      activeAdminTab === 'sync'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }\`}
                  >
                    Sync & Telemetry
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('backup')}
                    className={\`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer flex items-center gap-1.5 \${
                      activeAdminTab === 'backup'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }\`}
                  >
                    <Archive className="w-4 h-4" />
                    Backup
                  </button>`;

const target3 = `              {dbOverlayViewMode === 'admin' && activeAdminTab === 'users' ? (
                <UserManagementTab />
              ) : (`;
const replacement3 = `              {dbOverlayViewMode === 'admin' && activeAdminTab === 'users' ? (
                <UserManagementTab />
              ) : dbOverlayViewMode === 'admin' && activeAdminTab === 'backup' ? (
                <BackupRestoreTab 
                   profile={profile} 
                   foodLogs={foodLogs || []} 
                   biomarkerHistory={biomarkerHistory || []} 
                   setFoodLogs={setFoodLogs || (() => {})} 
                   setBiomarkerHistory={setBiomarkerHistory || (() => {})} 
                />
              ) : (`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched");
