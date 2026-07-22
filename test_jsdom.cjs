const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('dist/index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole: new (require('jsdom')).VirtualConsole().sendTo(console)
});

// Since the JS scripts in dist/assets might use ES modules, jsdom has some limitations,
// but let's see if we get the initial error!
setTimeout(() => {
  console.log('Done waiting');
  process.exit(0);
}, 3000);
