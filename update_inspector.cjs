const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const stateBlock = `
  const [themeActiveSection, setThemeActiveSection] = useState<'colors' | 'fonts' | 'tokens' | 'components' | 'elements' | 'presets'>('colors');
  const [inspectedElement, setInspectedElement] = useState<any>(null);
  const [inspectorProperty, setInspectorProperty] = useState('color');
  const [inspectorVariable, setInspectorVariable] = useState('');
`;

code = code.replace(/const \[themeActiveSection.*?\] = useState.*?;\n/g, stateBlock);

const effectBlock = `
  useEffect(() => {
    if (!themePreviewMode) {
      setInspectedElement(null);
      return;
    }
    const handler = (e: MouseEvent) => {
      if ((e.target as Element).closest('#theme-customizer-screen') || (e.target as Element).closest('#inspector-popup')) return;
      e.preventDefault();
      e.stopPropagation();
      
      const el = e.target as HTMLElement;
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = '#' + el.id;
      } else if (el.className && typeof el.className === 'string') {
        const cls = el.className.split(' ').map(c => c.trim()).filter(c => c && !c.includes(':') && !c.includes('/') && !c.includes('[') && !c.includes('!')).join('.');
        if (cls) selector += '.' + cls;
      }
      
      setInspectedElement({
        selector,
        rect: el.getBoundingClientRect(),
        text: el.innerText ? el.innerText.substring(0, 20) : 'Element'
      });
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [themePreviewMode]);

  // Handle saving overrides
  const saveOverride = () => {
    if (!inspectedElement || !inspectorVariable) return;
    const newOverrides = [...(profile.themeOverrides || []), {
      selector: inspectedElement.selector,
      property: inspectorProperty,
      variable: inspectorVariable
    }];
    setProfile({ ...profile, themeOverrides: newOverrides });
    setInspectedElement(null);
  };
`;

code = code.replace(/useEffect\(\(\) => \{\n    let interval: any;\n    if \(showAgentLogs\) \{/, effectBlock + "\n  useEffect(() => {\n    let interval: any;\n    if (showAgentLogs) {");

const popupBlock = `
      {/* Inspector Popup */}
      {inspectedElement && createPortal((
        <div id="inspector-popup" className="fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 w-64" style={{ top: Math.min(window.innerHeight - 250, inspectedElement.rect.bottom + 10), left: Math.min(window.innerWidth - 270, Math.max(10, inspectedElement.rect.left)) }}>
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{inspectedElement.selector}</h4>
            <button onClick={() => setInspectedElement(null)} className="text-slate-400 hover:text-slate-600 ml-2">✕</button>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Property</label>
            <select value={inspectorProperty} onChange={e => setInspectorProperty(e.target.value)} className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-slate-100">
              <option value="color">Text Color (color)</option>
              <option value="background-color">Background Color</option>
              <option value="border-color">Border Color</option>
              <option value="font-family">Font Family</option>
              <option value="font-size">Font Size</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Variable</label>
            <select value={inspectorVariable} onChange={e => setInspectorVariable(e.target.value)} className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-slate-100">
              <option value="">Select variable...</option>
              {inspectorProperty.includes('color') ? (
                <>
                  <option value="var(--color-indigo-600)">Primary Button</option>
                  <option value="var(--color-slate-50)">Background</option>
                  <option value="var(--color-white)">Card Background</option>
                  <option value="var(--color-slate-900)">Primary Text</option>
                  <option value="var(--color-slate-500)">Secondary Text</option>
                  <option value="var(--color-slate-200)">Border</option>
                  <option value="var(--color-rose-600)">Warning</option>
                  <option value="var(--color-amber-600)">Caution</option>
                  <option value="var(--color-emerald-600)">Success</option>
                  <option value="var(--color-slate-700)">Neutral</option>
                  <option value="var(--color-nutrient-calories)">Calories</option>
                  <option value="var(--color-nutrient-protein)">Protein</option>
                  <option value="var(--color-nutrient-carbohydrates)">Carbs</option>
                  <option value="var(--color-nutrient-totalFat)">Fat</option>
                  <option value="var(--color-nutrient-saturatedFat)">Sat. Fat</option>
                  <option value="var(--color-nutrient-sodium)">Sodium</option>
                </>
              ) : inspectorProperty === 'font-size' ? (
                <>
                  <option value="12px">Tiny (12px)</option>
                  <option value="14px">Small (14px)</option>
                  <option value="16px">Normal (16px)</option>
                  <option value="18px">Large (18px)</option>
                  <option value="20px">XL (20px)</option>
                  <option value="24px">2XL (24px)</option>
                  <option value="30px">3XL (30px)</option>
                </>
              ) : (
                <>
                  <option value="var(--font-sans)">Sans Font</option>
                  <option value="var(--font-mono)">Mono Font</option>
                  <option value="var(--font-display)">Display Font</option>
                </>
              )}
            </select>
          </div>
          <button onClick={saveOverride} className="w-full py-1.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">Assign Variable</button>
        </div>
      ), document.body)}

`;

code = code.replace(/\{showThemeScreen && createPortal\(\(/, popupBlock + "{showThemeScreen && createPortal((");

fs.writeFileSync('src/components/Header.tsx', code);
