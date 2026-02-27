const { chromium } = require('playwright');
const path = require('path');

(async () => {
    let browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 }, // iPhone X sizes
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();
        
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('file://' + path.join(process.cwd(), 'index.html'));
        await page.waitForTimeout(1000); 
        
        // Fill out required field
        await page.fill('#record-brand', 'ClickTest Brand');
        
        const btn = page.locator('#btn-save-record');
        
        // Ensure element is visible
        const isVisible = await btn.isVisible();
        console.log("Is btn-save-record visible:", isVisible);
        
        const isEnabled = await btn.isEnabled();
        console.log("Is btn-save-record enabled:", isEnabled);
        
        // Try a dispatch event click
        console.log("Dispatching click event...");
        await page.evaluate(() => document.getElementById('btn-save-record').click());
        
        await page.waitForTimeout(1000);
        
        const activeTab = await page.evaluate(() => {
            const active = document.querySelector('.view.active');
            return active ? active.id : null;
        });
        console.log("Active tab after simulated click:", activeTab);
        
        const hasData = await page.evaluate(() => {
            return document.querySelector('#history-table').innerHTML.includes('ClickTest Brand');
        });
        console.log("Data present in history:", hasData);
        
    } catch(e) {
        console.error("Test execution error:", e);
    } finally {
        await browser.close();
    }
})();
