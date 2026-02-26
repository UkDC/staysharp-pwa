const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({
          viewport: { width: 375, height: 812 }
        });
        
        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });
        
        await page.waitForTimeout(3000); // let auto-sync run
        
        // Go to history tab by clicking navigation
        console.log("Switching to History...");
        await page.evaluate(() => {
            document.querySelector('[data-target="history-view"]').click();
        });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'artifacts/screenshot-history.png' });
        console.log("Screenshot saved.");
        
    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
