const { chromium } = require('playwright');
(async () => {
    let browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        page.on('console', msg => console.log('LOG:', msg.text()));
        await page.goto('http://localhost:8080');
        await page.waitForTimeout(1000); 
        await page.fill('#record-brand', 'Test Inline');
        // Evaluate the onclick attribute directly just to check
        await page.evaluate(() => {
            const btn = document.getElementById('btn-save-record');
            console.log("Onclick attr:", btn.getAttribute('onclick'));
        });
        const box = await page.locator('#btn-save-record').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000);
    } catch(e) { console.error(e); } finally { await browser.close(); }
})();
