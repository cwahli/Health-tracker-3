const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const localPending = prev\.filter\(p => p\.sync_state === 'pending' \|\| p\.sync_state === 'update'\);/g,
  "const localPending = prev.filter(p => p.sync_state === 'pending' || p.sync_state === 'update' || p.sync_state === 'new' || p.sync_state === 'delete');"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
