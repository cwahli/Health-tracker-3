const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const targetDropdown = `              ) : inspectorProperty === 'font-size' ? (
                <>
                  <option value="12px">Tiny (12px)</option>
                  <option value="14px">Small (14px)</option>
                  <option value="16px">Normal (16px)</option>
                  <option value="18px">Large (18px)</option>
                  <option value="20px">XL (20px)</option>
                  <option value="24px">2XL (24px)</option>
                  <option value="30px">3XL (30px)</option>
                </>
              ) : (`;

const replDropdown = `              ) : inspectorProperty === 'font-size' ? (
                <>
                  <option value="var(--font-size-title)">Heading / Title</option>
                  <option value="var(--font-size-subtitle)">Subtitle</option>
                  <option value="var(--font-size-subtitle-small)">Small Subtitle</option>
                  <option value="var(--font-size-body)">Body (Base)</option>
                  <option value="var(--font-size-body-small)">Small Body</option>
                  <option value="var(--font-size-key-metric)">Key Metric</option>
                  <option value="var(--font-size-xs)">Extra Small (XS)</option>
                </>
              ) : (`;

code = code.replace(targetDropdown, replDropdown);
fs.writeFileSync('src/components/Header.tsx', code);
