const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const fontSelectOld = `<select
                          value={activeVal}
                          onChange={(e) => setProfile({ ...profile, [font.fontSizeKey]: e.target.value })}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center"
                        >
                          {font.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                          ))}
                        </select>`;

const fontSelectNew = `<CustomFontSelect value={activeVal} options={font.options} onChange={(val) => setProfile({ ...profile, [font.fontSizeKey]: val })} />`;
code = code.replace(fontSelectOld, fontSelectNew);

const sansSelectOld = `<select
                      value={profile.fontFamily || 'Inter'}
                      onChange={(e) => setProfile({ ...profile, fontFamily: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Space Grotesk">Space Grotesk</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Playfair Display">Playfair</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="system-ui">System UI</option><option value="Roboto">Roboto</option><option value="Open Sans">Open Sans</option><option value="Lato">Lato</option><option value="Montserrat">Montserrat</option><option value="Poppins">Poppins</option>
                    </select>`;

const sansSelectNew = `<CustomFontSelect isFamily value={profile.fontFamily || 'Inter'} options={[
  {value: 'Inter', label: 'Inter'},
  {value: 'Space Grotesk', label: 'Space Grotesk'},
  {value: 'Outfit', label: 'Outfit'},
  {value: 'Playfair Display', label: 'Playfair Display'},
  {value: 'Merriweather', label: 'Merriweather'},
  {value: 'system-ui', label: 'System UI'},
  {value: 'Roboto', label: 'Roboto'},
  {value: 'Open Sans', label: 'Open Sans'},
  {value: 'Lato', label: 'Lato'},
  {value: 'Montserrat', label: 'Montserrat'},
  {value: 'Poppins', label: 'Poppins'}
]} onChange={(val) => setProfile({ ...profile, fontFamily: val })} />`;
code = code.replace(sansSelectOld, sansSelectNew);

const monoSelectOld = `<select
                      value={profile.fontMono || 'JetBrains Mono'}
                      onChange={(e) => setProfile({ ...profile, fontMono: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center"
                    >
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Courier New">Courier New</option>
                    </select>`;

const monoSelectNew = `<CustomFontSelect isFamily value={profile.fontMono || 'JetBrains Mono'} options={[
  {value: 'JetBrains Mono', label: 'JetBrains Mono'},
  {value: 'Courier New', label: 'Courier New'}
]} onChange={(val) => setProfile({ ...profile, fontMono: val })} />`;
code = code.replace(monoSelectOld, monoSelectNew);

fs.writeFileSync('src/components/Header.tsx', code);
