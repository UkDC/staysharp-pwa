const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('file://' + process.cwd() + '/index.html');

    await page.evaluate(() => {
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('history-view').classList.remove('hidden');
    });

    console.log("Waiting for button to be enabled...");
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const disabled = await page.locator('#btn-sync').isDisabled();
      if (!disabled) break;
    }

    // Wait another sec just in case
    await page.waitForTimeout(1000);

    let txt1 = await page.locator('#btn-sync').textContent();
    let disabled = await page.locator('#btn-sync').isDisabled();
    console.log('Btn text before click:', txt1, '| disabled:', disabled);

    console.log("Clicking btn-sync...");
    await page.locator('#btn-sync').click();

    await page.waitForTimeout(500);
    const txt2 = await page.locator('#btn-sync').textContent();
    console.log('After click text:', txt2);

    await browser.close();
  } catch (e) {
    console.error("Test failed:", e);
    process.exit(1);
  }
})();
