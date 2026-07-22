const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const targetDropdown = `              {inspectorProperty.includes('color') ? (
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
              ) :`;

const replDropdown = `              {inspectorProperty.includes('color') ? (
                <>
                  <option value="var(--color-indigo-500)">Buttons & Highlights</option>
                  <option value="var(--color-slate-50)">App Background</option>
                  <option value="var(--color-white)">Card & Containers</option>
                  <option value="var(--color-slate-200)">Borders & Dividers</option>
                  <option value="var(--color-slate-900)">Primary Text</option>
                  <option value="var(--color-slate-500)">Secondary Text</option>
                  <option value="var(--color-rose-500)">Severe Warnings (Rose)</option>
                  <option value="var(--color-amber-500)">Caution / Moderate (Amber)</option>
                  <option value="var(--color-emerald-500)">Success Highlights (Green)</option>
                  <option value="var(--color-blue-500)">Information (Blue)</option>
                  <option value="var(--color-nutrient-calories)">Nutrient: Calories</option>
                  <option value="var(--color-nutrient-protein)">Nutrient: Protein</option>
                  <option value="var(--color-nutrient-carbohydrates)">Nutrient: Carbs</option>
                  <option value="var(--color-nutrient-totalFat)">Nutrient: Fat</option>
                  <option value="var(--color-nutrient-saturatedFat)">Nutrient: Sat. Fat</option>
                  <option value="var(--color-nutrient-sodium)">Nutrient: Sodium</option>
                  <option value="var(--color-slate-700)">Neutral Settings</option>
                </>
              ) :`;

code = code.replace(targetDropdown, replDropdown);
fs.writeFileSync('src/components/Header.tsx', code);
