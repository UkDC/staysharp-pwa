const { chromium } = require('playwright');
const path = require('path');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 }, // iPhone X sizes
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();

        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });
        await page.evaluate(() => document.querySelector('[data-target="calc-view"]').click());
        await page.waitForTimeout(500);

        const btn = page.locator('#btn-save-record');
        await btn.scrollIntoViewIfNeeded();

        // highlight the button
        await page.evaluate(() => {
            const btn = document.querySelector('#btn-save-record');
            btn.style.border = '5px solid red';
            btn.style.boxShadow = '0 0 20px red';
        });

        await page.screenshot({ path: path.join(process.cwd(), 'artifacts', 'btn-save-highlight.png') });
        console.log("Screenshot saved.");

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
