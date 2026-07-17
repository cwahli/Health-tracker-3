const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

// Revert the wrong addition
code = code.replace(
  'const [error, setError] = React.useState<boolean>(false);\n  const [warningsDismissed, setWarningsDismissed] = React.useState(false);',
  'const [error, setError] = React.useState<boolean>(false);'
);

// Add to FoodCard component
code = code.replace(
  'const [shouldShowButton, setShouldShowButton] = React.useState(false);',
  'const [shouldShowButton, setShouldShowButton] = React.useState(false);\n  const [warningsDismissed, setWarningsDismissed] = React.useState(false);'
);

fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
console.log('Fixed warningsDismissed state location');
