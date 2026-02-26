const { chromium } = require('playwright');
(async () => {
    try {
        let browser = await chromium.launch({ headless: true });
        let page = await browser.newPage({ viewport: { width: 375, height: 812 } });
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

        await page.evaluate(() => document.querySelector('[data-target="history-view"]').click());
        await page.waitForTimeout(1000);

        console.log("About to click btn-sync...");
        await page.evaluate(() => {
            const btn = document.querySelector('#btn-sync');
            const rect = btn.getBoundingClientRect();
            let x = rect.value || (rect.x + rect.width / 2);
            let y = rect.value || (rect.y + rect.height / 2);
            // using evaluate to click exactly
            btn.click();
        });

        await page.waitForTimeout(1000);

        await browser.close();
    } catch (e) {
        console.error("error:", e.message);
    }
})();
