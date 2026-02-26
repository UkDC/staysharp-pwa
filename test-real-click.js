const { chromium } = require('playwright');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
        await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });
        
        await page.waitForTimeout(2000);
        
        // Open sidebar
        console.log("Opening sidebar...");
        await page.locator('#sidebar-toggle').click();
        await page.waitForTimeout(500);
        
        console.log("Switching to history tab...");
        await page.locator('[data-target="history-view"]').click();
        await page.waitForTimeout(500);
        
        const textBefore = await page.locator('#btn-sync').textContent();
        console.log("Btn before click:", textBefore);
        
        console.log("Clicking btn-sync...");
        // This is a REAL user click
        await page.locator('#btn-sync').click();
        
        // Immediately check if text changed to ⏳ Синхронизация...
        const textImmediate = await page.locator('#btn-sync').textContent();
        console.log("Btn immediately after click:", textImmediate);
        
        await page.waitForTimeout(2000);
        const textAfter = await page.locator('#btn-sync').textContent();
        console.log("Btn 2s after click:", textAfter);
        
        const tableHtml = await page.locator('#history-table').innerHTML();
        console.log("Is history table populated?", tableHtml.includes('<tr'));
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        if (browser) await browser.close();
    }
})();
