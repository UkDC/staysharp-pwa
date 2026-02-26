const { chromium } = require('playwright');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

        console.log("Page loaded. Wait a bit for auto-sync.");
        await page.waitForTimeout(3000);

        console.log("Switching to History Tab...");
        await page.locator('[data-target="history-view"]').click({ force: true });
        await page.waitForTimeout(1000);

        const syncBtn = page.locator('#btn-sync');
        const textBefore = await syncBtn.textContent();
        const isDisabledBefore = await syncBtn.isDisabled();
        console.log('Button before click: text="' + textBefore + '", disabled=' + isDisabledBefore);

        console.log("Clicking Sync Button...");
        await syncBtn.click({ force: true });

        await page.waitForTimeout(500);

        const textAfter = await syncBtn.textContent();
        const isDisabledAfter = await syncBtn.isDisabled();
        console.log('Button 500ms after click: text="' + textAfter + '", disabled=' + isDisabledAfter);

        console.log("Wait up to 10s for sync to complete...");
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(1000);
            const t = await syncBtn.textContent();
            if (t.includes('✅')) {
                console.log('Sync finished successfully during polling. Text:', t);
                break;
            }
        }

    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
