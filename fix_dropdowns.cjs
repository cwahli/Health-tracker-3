const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const oldInspectorFontOptions = `<option value="var(--font-size-title)">Heading / Title</option>
                  <option value="var(--font-size-subtitle)">Subtitle</option>
                  <option value="var(--font-size-subtitle-small)">Small Subtitle</option>
                  <option value="var(--font-size-body)">Body (Base)</option>
                  <option value="var(--font-size-body-small)">Small Body</option>
                  <option value="var(--font-size-key-metric)">Key Metric</option>
                  <option value="var(--font-size-xs)">Extra Small (XS)</option>`;

const newInspectorFontOptions = `<option value="var(--font-size)">Base Root Font Size</option>
                  <option value="var(--font-size-title)">Heading / Title Font Size</option>
                  <option value="var(--font-size-subtitle)">Subtitle Font Size</option>
                  <option value="var(--font-size-body)">Standard Body Font Size</option>
                  <option value="var(--font-size-body-small)">Supporting / Caption Font Size</option>
                  <option value="var(--font-size-subtitle-small)">Small Section Tag Font Size</option>
                  <option value="var(--font-size-key-metric)">Key Metric Font Size</option>
                  <option value="var(--font-size-xs)">Micro / Label Font Size</option>`;

code = code.replace(oldInspectorFontOptions, newInspectorFontOptions);


const oldPortalStyle = `            style={{
              top: buttonRef.current.getBoundingClientRect().bottom + 4,
              left: buttonRef.current.getBoundingClientRect().left,
              width: buttonRef.current.getBoundingClientRect().width,
              maxHeight: '200px'
            }}`;

const newPortalStyle = `            style={{
              top: (buttonRef.current.getBoundingClientRect().bottom + 200 > window.innerHeight) ? undefined : buttonRef.current.getBoundingClientRect().bottom + 4,
              bottom: (buttonRef.current.getBoundingClientRect().bottom + 200 > window.innerHeight) ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 4 : undefined,
              left: buttonRef.current.getBoundingClientRect().left,
              width: buttonRef.current.getBoundingClientRect().width,
              maxHeight: '200px'
            }}`;

code = code.replace(oldPortalStyle, newPortalStyle);

fs.writeFileSync('src/components/Header.tsx', code);
