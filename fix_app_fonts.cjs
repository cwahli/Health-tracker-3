const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldCssStart = '  fontSizeCss += `';
const newCssStart = `  fontSizeCss += \`
    :root {
      --font-size-title: \${titleSize || '24px'} !important;
      --font-size-subtitle: \${subtitleSize || '18px'} !important;
      --font-size-subtitle-small: \${subtitleSmallSize} !important;
      --font-size-body: \${bodySize} !important;
      --font-size-body-small: \${smallSize || '12px'} !important;
      --font-size-key-metric: \${keyMetricSize} !important;
      --font-size-xs: \${xsSize} !important;
    }
`;
code = code.replace(oldCssStart, newCssStart);

fs.writeFileSync('src/App.tsx', code);
