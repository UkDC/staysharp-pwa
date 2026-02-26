const fs = require('fs');
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    // remove query params
    filePath = filePath.split('?')[0];

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
});

server.listen(8080, async () => {
    console.log('Server running at http://localhost:8080/');
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        });
        const page = await context.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

        await page.goto('http://localhost:8080/');
        await page.waitForTimeout(2000);

        // Click History
        console.log("Navigating to history...");
        await page.locator('[data-target="history-view"]').click();
        await page.waitForTimeout(1000);

        const btnText = await page.locator('#btn-sync').textContent();
        console.log("Button text before:", btnText);

        console.log("Waiting for auto-sync to finish (checking button stats)...");
        for (let i = 0; i < 10; i++) {
            let disabled = await page.locator('#btn-sync').isDisabled();
            if (!disabled) break;
            await page.waitForTimeout(1000);
        }

        const isBtnDisabled = await page.locator('#btn-sync').isDisabled();
        console.log("Is button disabled?", isBtnDisabled);

        console.log("Clicking button physically...");
        await page.locator('#btn-sync').click();

        await page.waitForTimeout(100);
        const textImmediately = await page.locator('#btn-sync').textContent();
        console.log("Immediately after click text:", textImmediately);

        await page.waitForTimeout(2000);
        const textAfter2s = await page.locator('#btn-sync').textContent();
        console.log("2s after click text:", textAfter2s);

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        if (browser) await browser.close();
        server.close();
    }
});
