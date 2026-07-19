const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  // Keep localStorage updated with React states so that hasLocal and canSkipFetch work flawlessly!
  useEffect(() => {
    if (!profile) return;
    const bundle = {`;

const replacement = `  // Keep localStorage updated with React states so that hasLocal and canSkipFetch work flawlessly!
  useEffect(() => {
    // Prevent overwriting local storage with empty arrays during initial loading/syncing
    if (!profile || (syncState !== 'synced' && syncState !== 'local' && syncState !== 'conflict')) return;
    const bundle = {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
} else {
  console.log("Target not found!");
}
