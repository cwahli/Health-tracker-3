const fs = require('fs');
let code = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
console.log(code.substring(code.indexOf('type === \'food\' \n                  ? t.addFood'), code.indexOf('t.addMedical}') + 13));
