const { chromium } = require('playwright');
(async () => {
    let browser = await chromium.launch({ headless: true });
    let page = await browser.newPage();
    await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });
    
    // Evaluate in page to get event listeners if possible
    // Wait for everything
    await page.waitForTimeout(2000);
    
    const clickWorks = await page.evaluate(() => {
        let clicked = false;
        const btn = document.querySelector('#btn-sync');
        btn.addEventListener('click', () => { clicked = true; });
        btn.click();
        return clicked;
    });
    
    console.log("Did click fire our custom listener?", clickWorks);
    
    await browser.close();
})();
