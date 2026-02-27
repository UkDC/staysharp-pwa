const { chromium } = require('playwright');
const path = require('path');

(async () => {
    let browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('file://' + path.join(process.cwd(), 'index.html'));
    
    const ids = [
        'record-brand', 'record-series', 'record-steel', 'record-carbon',
        'record-crmov', 'record-length', 'record-width', 'record-angle',
        'record-honing-add', 'record-bess', 'record-comments'
    ];
    
    for (let id of ids) {
        const elDetails = await page.evaluate((id) => {
            const el = document.getElementById(id);
            return el ? 'Found' : 'MISSING';
        }, id);
        console.log(`${id}: ${elDetails}`);
    }
    
    await browser.close();
})();
