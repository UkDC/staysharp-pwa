const { chromium } = require('playwright');
(async () => {
    let browser = await chromium.launch({ headless: true });
    let page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

    await page.evaluate(() => document.querySelector('[data-target="history-view"]').click());
    await page.waitForTimeout(1000);

    const toggleBounds = await page.evaluate(() => document.querySelector('#sidebar-toggle').getBoundingClientRect());
    console.log("Toggle Bounds:", toggleBounds);

    const btnBounds = await page.evaluate(() => document.querySelector('#btn-sync').getBoundingClientRect());
    console.log("Sync Button Bounds:", btnBounds);

    await browser.close();
})();
