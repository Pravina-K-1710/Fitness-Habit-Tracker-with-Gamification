const puppeteer = require('puppeteer');
(async()=>{
  const browser = await puppeteer.launch({headless:true, args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[console:${type}] ${text}`);
    if (type === 'error' || type === 'warning') errors.push({type, text});
  });
  page.on('pageerror', err => {
    console.log(`[pageerror] ${err.toString()}`);
    errors.push({type: 'pageerror', text: err.toString()});
  });
  try {
    await page.goto('http://localhost:5173', {waitUntil: 'networkidle2', timeout: 15000});
  } catch(e) {
    console.error('NAV_ERROR', e.toString());
    await browser.close();
    process.exit(2);
  }
  await page.waitForTimeout(2000);
  await browser.close();
  if (errors.length === 0) {
    console.log('NO_ERRORS_DETECTED');
    process.exit(0);
  }
  console.log('ERRORS_DETECTED:', JSON.stringify(errors, null, 2));
  process.exit(1);
})().catch(e=>{ console.error('CRASH', e); process.exit(3); });
