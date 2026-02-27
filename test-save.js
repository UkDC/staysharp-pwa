const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

        await page.waitForTimeout(1000);

        // Let's type something unique
        const uniqueBrand = 'Brand_' + Date.now();
        await page.fill('#record-brand', uniqueBrand);

        console.log("Clicking save record...");
        await page.locator('#btn-save-record').click();

        await page.waitForTimeout(1000);

        const historyHtml = await page.locator('#history-table').innerHTML();
        console.log("Did it save to history local table?", historyHtml.includes(uniqueBrand));

    } catch (e) {
        console.error("Test execution error:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
