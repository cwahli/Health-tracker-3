const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replacement = `
  colorCss += \`
    }
  \`;

  if (profile.themeOverrides && Array.isArray(profile.themeOverrides)) {
    profile.themeOverrides.forEach(override => {
      colorCss += \`
        \${override.selector} {
          \${override.property}: \${override.variable} !important;
        }
      \`;
    });
  }
`;

code = code.replace(/  if \(profile\.themeOverrides.*?\}\n  \`;/s, replacement);
fs.writeFileSync('src/App.tsx', code);
