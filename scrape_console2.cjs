const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const text = await page.evaluate(() => document.body.innerText);
  console.log('TEXT:', text.substring(0, 500));
  await browser.close();
})();
