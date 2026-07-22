const fs = require('fs');

let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Add themeCompactMode
content = content.replace(
  'const [themePreviewMode, setThemePreviewMode] = useState(false);',
  'const [themePreviewMode, setThemePreviewMode] = useState(false);\n  const [themeCompactMode, setThemeCompactMode] = useState(false);'
);

// Fix the header layout for the modal
content = content.replace(
  `            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Theme & Accent Settings</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setThemePreviewMode(!themePreviewMode)}
                  className={\`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer border \${themePreviewMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}\`}
                >
                  {themePreviewMode ? 'Exit Preview' : 'Preview'}
                </button>
                <button
                  onClick={() => {
                    if (onSaveProfile) {
                      onSaveProfile(profile);
                    }
                    setShowThemeScreen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowThemeScreen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dynamic Section Dropdown Selector */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 text-left">
              <select
                value={themeActiveSection}
                onChange={(e) => setThemeActiveSection(e.target.value as any)}
                className="text-sm font-semibold bg-white border border-slate-250 dark:border-slate-700 rounded-full px-4 py-2 text-slate-900 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
              >
                <option value="colors">🎨 Colours ({auditColors.length} Items)</option>
                <option value="fonts">🔤 Font ({auditFonts.length} Sizes)</option>
                <option value="tokens">📐 Design Token ({auditDesignTokens.length} Factors)</option>
                <option value="components">📦 Components (4 Audited)</option>
                <option value="elements">🔗 Elements (9 Audited)</option>
                <option value="presets">🔖 Presets</option>
              </select>
            </div>`,
  `            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 hidden sm:block">Theme & Accent Settings</h2>
                {themePreviewMode && (
                  <select
                    value={themeActiveSection}
                    onChange={(e) => setThemeActiveSection(e.target.value as any)}
                    className="text-sm font-semibold bg-white border border-slate-250 dark:border-slate-700 rounded-full px-3 py-1.5 text-slate-900 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
                  >
                    <option value="colors">🎨 Colours</option>
                    <option value="fonts">🔤 Font</option>
                    <option value="tokens">📐 Token</option>
                    <option value="components">📦 Components</option>
                    <option value="elements">🔗 Elements</option>
                    <option value="presets">🔖 Presets</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {themePreviewMode && (
                  <button
                    onClick={() => setThemeCompactMode(!themeCompactMode)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mr-1"
                    title={themeCompactMode ? "Expand" : "Compact Mode"}
                  >
                    {themeCompactMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setThemePreviewMode(!themePreviewMode);
                    if (themeCompactMode) setThemeCompactMode(false);
                  }}
                  className={\`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer border \${themePreviewMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}\`}
                >
                  {themePreviewMode ? 'Exit Preview' : 'Preview'}
                </button>
                <button
                  onClick={() => {
                    if (onSaveProfile) {
                      onSaveProfile(profile);
                    }
                    setShowThemeScreen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowThemeScreen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dynamic Section Dropdown Selector */}
            {!themePreviewMode && (
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 text-left">
                <select
                  value={themeActiveSection}
                  onChange={(e) => setThemeActiveSection(e.target.value as any)}
                  className="text-sm font-semibold bg-white border border-slate-250 dark:border-slate-700 rounded-full px-4 py-2 text-slate-900 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
                >
                  <option value="colors">🎨 Colours ({auditColors.length} Items)</option>
                  <option value="fonts">🔤 Font ({auditFonts.length} Sizes)</option>
                  <option value="tokens">📐 Design Token ({auditDesignTokens.length} Factors)</option>
                  <option value="components">📦 Components (4 Audited)</option>
                  <option value="elements">🔗 Elements (9 Audited)</option>
                  <option value="presets">🔖 Presets</option>
                </select>
              </div>
            )}`
);

// Apply compact mode
content = content.replace(
  'const themeContainerClasses = `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto ${themePreviewMode ? \'lg:ml-4 mt-4 lg:mt-0\' : \'\'}`;',
  'const themeContainerClasses = `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto ${themePreviewMode ? \'lg:ml-4 mt-4 lg:mt-0\' : \'\'}`;'
);
// Actually it's defined directly in JSX.
content = content.replace(
  /<div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-\[90vh\] animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto \$\{themePreviewMode \? 'lg:ml-4 mt-4 lg:mt-0' : ''\}`}/g,
  '<div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto ${themePreviewMode ? \'lg:ml-4 mt-4 lg:mt-0\' : \'\'} ${themeCompactMode ? \'max-h-[250px]\' : \'max-h-[90vh]\'}`}>'
);

// Fix the container background of sections (remove borders and background)
content = content.replace(
  `                  {/* Theme Reset Button */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
                    <div className="space-y-0.5 text-left pr-4">
                      <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">Reset Colors & Tokens</h4>
                    </div>
                    <button`,
  `                  {/* Theme Reset Button */}
                  <div className="flex justify-end items-center px-4 py-2">
                    <button`
);

content = content.replace(/bg-slate-50 dark:bg-slate-800\/50 rounded-2xl border border-slate-150 dark:border-slate-800/g, 'rounded-2xl');
content = content.replace(/bg-slate-50 dark:bg-slate-800\/40 rounded-2xl border border-slate-150 dark:border-slate-800/g, 'rounded-2xl');
// Sometimes it has p-3 or p-4 before it
// The above global replacements will leave "p-3 rounded-2xl" etc, which is perfectly fine.

// Let's also check for Elements and Components where borders are
content = content.replace(/bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm/g, 'rounded-3xl');
content = content.replace(/bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800/g, 'rounded-3xl');

fs.writeFileSync('src/components/Header.tsx', content);

