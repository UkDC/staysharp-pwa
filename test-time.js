const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        let page = await browser.newPage({ viewport: { width: 375, height: 812 } });
        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

        for (let i = 1; i <= 15; i++) {
            await page.waitForTimeout(1000);
            let txt = await page.locator('#btn-sync').textContent();
            console.log(`Sec ${i}: ${txt}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
