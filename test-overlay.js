const { chromium } = require('playwright');

(async () => {
    let browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        
        // Log all console messages
        page.on('console', msg => console.log('LOG:', msg.text()));
        
        await page.goto('http://localhost:8080');
        await page.waitForTimeout(1000); 
        
        // Inject script to log what was actually clicked
        await page.evaluate(() => {
            document.addEventListener('click', e => {
                console.log('Global click caught on:', e.target.tagName, e.target.id, e.target.className);
            }, true); // use capture phase
        });
        
        await page.fill('#record-brand', 'Overlay Test');
        
        // Try clicking by coordinates
        const btn = page.locator('#btn-save-record');
        const box = await btn.boundingBox();
        console.log("Button box:", box);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        
        await page.waitForTimeout(1000);
        
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
