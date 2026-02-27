const { chromium } = require('playwright');

(async () => {
    let browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        page.on('console', msg => console.log('LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('http://localhost:8080');
        await page.waitForTimeout(1000); 
        
        await page.fill('#record-brand', 'Localhost Brand');
        const isVisible = await page.locator('#btn-save-record').isVisible();
        console.log("Visible?", isVisible);
        await page.click('#btn-save-record');
        await page.waitForTimeout(1000);
        
        const activeTab = await page.evaluate(() => {
            const active = document.querySelector('.view.active');
            return active ? active.id : null;
        });
        console.log("Active tab:", activeTab);
        
        const hasData = await page.evaluate(() => {
            return document.querySelector('#history-table').innerHTML.includes('Localhost Brand');
        });
        console.log("Data present:", hasData);
        
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
