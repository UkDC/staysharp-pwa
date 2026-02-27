const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();

        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });

        await page.waitForTimeout(1000);

        await page.fill('#record-brand', 'ClickTest Brand');

        // Let's test a real visual tap
        const btn = page.locator('#btn-save-record');
        const box = await btn.boundingBox();
        console.log("Button box:", box);

        if (box) {
            await btn.scrollIntoViewIfNeeded();
            // recalculate box after scroll
            const newBox = await btn.boundingBox();
            await page.mouse.click(newBox.x + newBox.width / 2, newBox.y + newBox.height / 2);
            await page.waitForTimeout(1000);

            const activeTab = await page.evaluate(() => {
                const active = document.querySelector('.view.active');
                return active ? active.id : null;
            });
            console.log("Active tab after click:", activeTab);
        }

    } catch (e) {
        console.error("Test execution error:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
