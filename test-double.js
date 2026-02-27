const { chromium } = require('playwright');
const path = require('path');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        let alerts = 0;
        page.on('dialog', async dialog => {
            console.log("ALERT RECEIVED:", dialog.message());
            alerts++;
            await dialog.dismiss();
        });
        
        await page.goto('file://' + path.join(process.cwd(), 'index.html'));
        await page.waitForTimeout(1000); 
        await page.fill('#record-brand', 'Test Double');
        await page.click('#btn-save-record');
        await page.waitForTimeout(1000);
        
        console.log("Number of alerts:", alerts);
    } catch(e) {
        console.error(e);
    } finally {
        if(browser) await browser.close();
    }
})();
