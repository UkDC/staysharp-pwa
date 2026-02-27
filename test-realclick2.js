const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('LOG:', msg.text()));
    await page.goto('http://localhost:8080/');
    await page.fill('#record-brand', 'RealClickTest');
    await page.click('#btn-save-record', {force: true});
    await page.waitForTimeout(1500); // Wait for sequence
    const logs = await page.evaluate(() => {
        return {
           btnText: document.getElementById('btn-save-record').textContent,
           historyLen: JSON.parse(localStorage.getItem('staysharp_history')||'[]').length
        }
    });
    console.log("Stats after save:", logs);
    await browser.close();
    process.exit(0);
})();
