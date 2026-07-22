const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const customSelectCode = `
const sizeMap: Record<string, string> = {
  tiny: '12px',
  small: '14px',
  normal: '16px',
  large: '18px',
  xl: '20px',
  xxl: '24px',
  '3xl': '30px',
  '4xl': '36px'
};

function CustomFontSelect({ 
  value, 
  options, 
  onChange, 
  isFamily = false 
}: { 
  value: string; 
  options: {value: string, label: string}[]; 
  onChange: (val: string) => void;
  isFamily?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  
  return (
    <>
      <button 
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center relative flex justify-between items-center"
      >
        <span className="flex-1 text-center" style={{ fontFamily: isFamily ? value : undefined, fontSize: !isFamily ? sizeMap[value] : undefined }}>
           {options.find(o => o.value === value)?.label.split(' ')[0] || value}
        </span>
        <span className="text-[8px] opacity-50 ml-2">▼</span>
      </button>
      
      {isOpen && buttonRef.current && createPortal(
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)} />
          <div 
            className="fixed z-[160] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-y-auto"
            style={{
              top: buttonRef.current.getBoundingClientRect().bottom + 4,
              left: buttonRef.current.getBoundingClientRect().left,
              width: buttonRef.current.getBoundingClientRect().width,
              maxHeight: '200px'
            }}
          >
            {options.map(opt => (
              <div 
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  fontFamily: isFamily ? opt.value : undefined,
                  fontSize: !isFamily ? sizeMap[opt.value] : undefined,
                }}
                className={\`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 \${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}\`}
              >
                {opt.label.split(' ')[0]}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
`;

// Insert the code just before "export default function Header("
code = code.replace('export default function Header(', customSelectCode + '\\nexport default function Header(');

// Replace the size selects
code = code.replace(
  /<select\\s+value=\{activeVal\}\\s+onChange=\{\(e\) => setProfile\(\{ \.\.\.profile, \[font\.fontSizeKey\]: e\.target\.value \}\)\}\\s+className="w-full.*?"\\s+>\\s+\{font\.options\.map\(\(opt\) => \(\\s+<option key=\{opt\.value\} value=\{opt\.value\}>\{opt\.label\.split\(' '\)\[0\]\}<\/option>\\s+\)\)\}\\s+<\/select>/s,
  `<CustomFontSelect value={activeVal} options={font.options} onChange={(val) => setProfile({ ...profile, [font.fontSizeKey]: val })} />`
);

// Replace Sans Font select
const sansSelectRegex = /<select\\s+value=\{profile\.fontFamily \|\| 'Inter'\}\\s+onChange=\{\(e\) => setProfile\(\{ \.\.\.profile, fontFamily: e\.target\.value \}\)\}\\s+className="w-full.*?">.*?<\/select>/s;

const sansOptions = [
  {value: 'Inter', label: 'Inter'},
  {value: 'Space Grotesk', label: 'Space Grotesk'},
  {value: 'Outfit', label: 'Outfit'},
  {value: 'Playfair Display', label: 'Playfair'},
  {value: 'Merriweather', label: 'Merriweather'},
  {value: 'system-ui', label: 'System UI'},
  {value: 'Roboto', label: 'Roboto'},
  {value: 'Open Sans', label: 'Open Sans'},
  {value: 'Lato', label: 'Lato'},
  {value: 'Montserrat', label: 'Montserrat'},
  {value: 'Poppins', label: 'Poppins'}
];
code = code.replace(sansSelectRegex, `<CustomFontSelect isFamily value={profile.fontFamily || 'Inter'} options={${JSON.stringify(sansOptions)}} onChange={(val) => setProfile({ ...profile, fontFamily: val })} />`);

// Replace Mono Font select
const monoSelectRegex = /<select\\s+value=\{profile\.fontMono \|\| 'JetBrains Mono'\}\\s+onChange=\{\(e\) => setProfile\(\{ \.\.\.profile, fontMono: e\.target\.value \}\)\}\\s+className="w-full.*?">.*?<\/select>/s;

const monoOptions = [
  {value: 'JetBrains Mono', label: 'JetBrains Mono'},
  {value: 'Courier New', label: 'Courier New'}
];
code = code.replace(monoSelectRegex, `<CustomFontSelect isFamily value={profile.fontMono || 'JetBrains Mono'} options={${JSON.stringify(monoOptions)}} onChange={(val) => setProfile({ ...profile, fontMono: val })} />`);

fs.writeFileSync('src/components/Header.tsx', code);
